import asyncio

from sqlmodel import Session, select

from app.core.database import engine
from app.models.note import Note
from app.models.user import User


async def main():
    with Session(engine) as session:
        user = session.exec(select(User)).first()
        if not user:
            print("No user found")
            return

        try:
            note = Note(title="Test Note", content="Test Content", user_id=user.id)
            session.add(note)
            session.commit()
            print("Note created successfully!")
        except Exception as e:
            print("ERROR:")
            print(repr(e))


if __name__ == "__main__":
    asyncio.run(main())
