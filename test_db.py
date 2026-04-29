from database import engine

conn=engine.connect()

print("Connected to AWS MySQL RDS!")

conn.close()