import enum


class Role(str, enum.Enum):
    TEACHER = "Teacher"
    STUDENT = "Student"
    SPONSOR = "Sponsor"
