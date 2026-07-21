import asyncio

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.database import engine
from app.models.note import Note
from app.models.user import User


async def main():
    async with AsyncSession(engine) as session:
        result = await session.execute(select(User))
        user = result.scalars().first()
        if not user:
            print("No user found")
            return

        try:
            print("Creating note...")
            note = Note(title="Test Note", content="Test Content", user_id=user.id)
            session.add(note)
            await session.commit()
            print("Note created successfully!")
        except Exception:
            print("ERROR CAUGHT:")
            import traceback

            traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
