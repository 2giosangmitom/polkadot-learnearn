'use server';

import { createCourse, updateCourse as updateCourseRecord } from "@/lib/courses/courseService";
import { supabase } from "@/lib/supabase/client";

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

  const { wallet_address, lessons, ...courseData } = payload;

  // Update course basic info
  await updateCourseRecord(courseId, courseData, wallet_address);

  // Handle lessons if provided
  if (lessons && Array.isArray(lessons)) {
    // Get existing lessons
    const { data: existingLessons } = await supabase
      .from('lesson')
      .select('id')
      .eq('course_id', courseId);

    const existingLessonIds = new Set(existingLessons?.map(l => l.id) || []);
    const providedLessonIds = new Set(lessons.filter(l => l.id).map(l => l.id));

    // Delete lessons that are no longer in the list
    const lessonsToDelete = Array.from(existingLessonIds).filter(id => !providedLessonIds.has(id));
    if (lessonsToDelete.length > 0) {
      await supabase
        .from('lesson')
        .delete()
        .in('id', lessonsToDelete);
    }

    // Update existing lessons and create new ones
    for (const lesson of lessons) {
      if (!lesson.title) continue;

      const lessonData = {
        title: lesson.title,
        description: lesson.description || null,
        video_url: lesson.video_url || null,
        payback_amount: lesson.payback_amount || null,
        lesson_index: lesson.lesson_index ?? 0,
      };

      if (lesson.id && existingLessonIds.has(lesson.id)) {
        // Update existing lesson
        await supabase
          .from('lesson')
          .update({
            ...lessonData,
            update_at: new Date().toISOString(),
          })
          .eq('id', lesson.id);
      } else {
        // Create new lesson
        await supabase
          .from('lesson')
          .insert({
            ...lessonData,
            course_id: courseId,
          });
      }
    }
  }
}

export async function deleteCourse(courseId: string) {
  // Server action to delete a course
}
