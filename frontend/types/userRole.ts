export enum UserRoleValue {
  STUDENT = 1,
  TEACHER = 2,
}

export type UserRoleState = 'unknown' | 'student' | 'teacher';

export function getUserRoleState(roleValue: number | undefined | null): UserRoleState {
  switch (roleValue) {
    case UserRoleValue.TEACHER:
      return 'teacher';
    case UserRoleValue.STUDENT:
      return 'student';
    default:
      return 'unknown';
  }
}

export function isTeacher(roleValue: number | undefined | null): boolean {
  return roleValue === UserRoleValue.TEACHER;
}

export function isStudent(roleValue: number | undefined | null): boolean {
  return roleValue === UserRoleValue.STUDENT;
}
