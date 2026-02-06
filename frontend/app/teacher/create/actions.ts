'use server';

import { createCourse, updateCourse as updateCourseRecord } from "@/lib/courses/courseService";

export async function createCourseAction(formData: FormData) {
  const payloadRaw = formData.get("course");

  if (!payloadRaw) {
    throw new Error("Missing course payload");
  }

  const payload = JSON.parse(payloadRaw as string);

  if (!payload.wallet_address) {
    throw new Error("wallet_address is required to create a course");
  }

  await createCourse(payload);
}

export async function updateCourseAction(courseId: string, formData: FormData) {
  const payloadRaw = formData.get("course");

  if (!payloadRaw) {
    throw new Error("Missing course payload");
  }

  const payload = JSON.parse(payloadRaw as string);

  if (!payload.wallet_address) {
    throw new Error("wallet_address is required to update a course");
  }

  const { wallet_address, lessons: _ignoredLessons, ...courseData } = payload;

  await updateCourseRecord(courseId, courseData, wallet_address);
}

export async function deleteCourse(courseId: string) {
  // Server action to delete a course
}
