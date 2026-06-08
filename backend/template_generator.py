"""
WorkRobo.ai - Template Generator
Pre-populates the database with high-value templates for the Robo-Gallery Marketplace.
"""

import asyncio
import os
import uuid
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

async def generate_templates():
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ.get('DB_NAME', 'workrobo')]

    print("Connecting to database...")

    templates = [
        {
            "id": str(uuid.uuid4()),
            "name": "Competitor Price Watcher",
            "description": "Automatically scrape competitor pricing pages daily. Uses Gemini to analyze price drops and sends a Pulse email to your sales team.",
            "is_public": True,
            "template_category": "Monitoring",
            "nodes": [
                {"id": "n1", "type": "sentry", "data": {"config": {"url": "https://competitor.com/pricing", "selector": ".price"}}},
                {"id": "n2", "type": "hive", "data": {"config": {"prompt": "Did the price drop? Data: {{scraped_data}}"}}},
                {"id": "n3", "type": "pulse", "data": {"config": {"to": "sales@company.com", "subject": "Price Drop Alert", "body": "{{ai_summary}}"}}}
            ],
            "edges": [
                {"id": "e1", "source": "n1", "target": "n2"},
                {"id": "e2", "source": "n2", "target": "n3"}
            ]
        },
        {
            "id": str(uuid.uuid4()),
            "name": "LinkedIn Lead Scraper",
            "description": "Monitors search results for your target audience, extracts their public details, and automatically categorizes them using Hive Brain.",
            "is_public": True,
            "template_category": "Sales",
            "nodes": [
                {"id": "n1", "type": "sentry", "data": {"config": {"url": "https://linkedin.com/search/...", "selector": ".search-result"}}},
                {"id": "n2", "type": "hive", "data": {"config": {"prompt": "Categorize these leads into High/Medium/Low priority based on their titles: {{scraped_data}}"}}},
                {"id": "n3", "type": "database", "data": {"config": {"operation": "insert", "collection": "leads", "data": "{{ai_summary}}"}}}
            ],
            "edges": [
                {"id": "e1", "source": "n1", "target": "n2"},
                {"id": "e2", "source": "n2", "target": "n3"}
            ]
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Daily News Summarizer",
            "description": "Scrapes your favorite tech blogs every morning at 8 AM. Gemini summarizes the top 5 articles into a clean email digest.",
            "is_public": True,
            "template_category": "Productivity",
            "nodes": [
                {"id": "n1", "type": "trigger", "data": {"config": {"type": "schedule", "cron": "0 8 * * *"}}},
                {"id": "n2", "type": "sentry", "data": {"config": {"url": "https://techcrunch.com", "selector": ".post-title"}}},
                {"id": "n3", "type": "hive", "data": {"config": {"prompt": "Summarize the top 5 news titles in 3 bullet points: {{scraped_data}}"}}},
                {"id": "n4", "type": "pulse", "data": {"config": {"to": "{{user.email}}", "subject": "Daily Tech Digest", "body": "{{ai_summary}}"}}}
            ],
            "edges": [
                {"id": "e1", "source": "n1", "target": "n2"},
                {"id": "e2", "source": "n2", "target": "n3"},
                {"id": "e3", "source": "n3", "target": "n4"}
            ]
        }
    ]

    for t in templates:
        print(f"Upserting Template: {t['name']}")
        await db.streams.update_one(
            {"name": t["name"], "is_public": True},
            {"$set": t},
            upsert=True
        )

    print("Template generation complete!")
    client.close()

if __name__ == "__main__":
    asyncio.run(generate_templates())
