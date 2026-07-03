import asyncio
import uuid
from app.core.database import engine
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.note import Note, ContentType
from app.models.user import User
from app.schemas.note import NoteCreate
from sqlmodel import select

async def main():
    async with AsyncSession(engine) as session:
        result = await session.execute(select(User))
        user = result.scalars().first()
        if not user:
            print("No user found")
            return
            
        note_in = NoteCreate(title="Test Note", content="Test Content", tags=["test"])
        note_data = note_in.model_dump(exclude={"tags"})
        print("note_data:", note_data)
        
        try:
            print("Creating note with **note_data...")
            note = Note(**note_data, user_id=user.id)
            session.add(note)
            await session.commit()
            print("Note created successfully!")
        except Exception as e:
            print("ERROR CAUGHT:")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
