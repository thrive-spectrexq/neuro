import asyncio
import uuid
from app.core.database import engine
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.note import Note
from app.models.user import User
from app.schemas.note import NoteCreate
from app.api.routes.notes import create_note
from sqlmodel import select

async def main():
    async with AsyncSession(engine) as session:
        result = await session.execute(select(User))
        user = result.scalars().first()
        if not user:
            print("No user found")
            return
            
        note_in = NoteCreate(title="Test Note", content="Test Content", tags=["test"])
        
        try:
            print("Creating note via endpoint...")
            response = await create_note(note_in=note_in, session=session, current_user=user)
            print("Response:", response)
        except Exception as e:
            print("ERROR CAUGHT:")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
