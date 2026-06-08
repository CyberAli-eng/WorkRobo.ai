import asyncio
import logging
from datetime import datetime, timezone
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.jobstores.mongodb import MongoDBJobStore
from motor.motor_asyncio import AsyncIOMotorClient
import os
from server import db, app, ws_manager, get_scraper, gemini_model
from executor import WorkflowExecutor
import httpx

logger = logging.getLogger(__name__)

class HiveClock:
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        
        # Connect APScheduler to MongoDB for persistence if needed
        # mongo_url = os.environ.get('MONGO_URL')
        # if mongo_url:
        #     self.scheduler.add_jobstore('mongodb', client=AsyncIOMotorClient(mongo_url), database='workrobo', collection='jobs')

    def start(self):
        """Start the background scheduler"""
        if not self.scheduler.running:
            self.scheduler.start()
            logger.info("Hive-Clock Scheduler started")

    def stop(self):
        """Stop the background scheduler"""
        if self.scheduler.running:
            self.scheduler.shutdown()
            logger.info("Hive-Clock Scheduler stopped")

    async def execute_scheduled_stream(self, stream_id: str, user_id: str):
        """Callback to execute a stream on schedule"""
        logger.info(f"Cron triggered execution for Stream {stream_id}")
        
        stream = await db.streams.find_one({
            "id": stream_id, 
            "user_id": user_id,
            "is_active": True
        })
        
        if not stream:
            logger.warning(f"Stream {stream_id} not found or inactive, skipping execution")
            return
            
        try:
            scraper = await get_scraper()
            
            async def noop_status_callback(update):
                # Don't send real-time websocket updates for cron jobs unless client is active
                pass
                
            executor = WorkflowExecutor(
                db=db,
                scraper=scraper,
                gemini_model=gemini_model,
                status_callback=noop_status_callback
            )
            
            ctx = await executor.execute_stream(stream, user_id, trigger_data={"source": "scheduler"})
            logger.info(f"Cron execution completed for Stream {stream_id}. Success: {len(ctx.errors) == 0}")
            
        except Exception as e:
            logger.error(f"Cron execution failed for {stream_id}: {e}")

    async def sync_schedules(self):
        """Syncs jobs from the database into the APScheduler"""
        # Read from Supabase/Scheduler collection
        schedules = await db.scheduler.find({"is_active": True}).to_list(1000)
        
        # Clear existing jobs to ensure clean state
        self.scheduler.remove_all_jobs()
        
        for sched in schedules:
            stream_id = sched["stream_id"]
            cron_expr = sched.get("cron_expression")
            user_id = sched["user_id"] # Assuming user_id is saved
            
            if not cron_expr or not stream_id:
                continue
                
            try:
                # Add cron job
                self.scheduler.add_job(
                    self.execute_scheduled_stream,
                    CronTrigger.from_crontab(cron_expr),
                    args=[stream_id, user_id],
                    id=f"stream_{stream_id}",
                    replace_existing=True
                )
                logger.info(f"Scheduled stream {stream_id} with cron {cron_expr}")
            except Exception as e:
                logger.error(f"Failed to schedule stream {stream_id}: {e}")

# Global instance
hive_clock = HiveClock()

# Tie to FastAPI lifecycle
@app.on_event("startup")
async def start_scheduler():
    hive_clock.start()
    await hive_clock.sync_schedules()

@app.on_event("shutdown")
async def stop_scheduler():
    hive_clock.stop()
