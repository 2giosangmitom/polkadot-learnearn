/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import {
  createCourse,
  updateCourse as updateCourseRecord,
} from "@/lib/courses/courseService";
import { supabase } from "@/lib/supabase/client";
import { YtDlp } from "ytdlp-nodejs";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import z from "zod";

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
      .from("lesson")
      .select("id")
      .eq("course_id", courseId);

    const existingLessonIds = new Set(existingLessons?.map((l) => l.id) || []);
    const providedLessonIds = new Set(
      lessons.filter((l) => l.id).map((l) => l.id),
    );

    // Delete lessons that are no longer in the list
    // (cascading quiz deletion should be handled by FK, but we clean up explicitly)
    const lessonsToDelete = Array.from(existingLessonIds).filter(
      (id) => !providedLessonIds.has(id),
    );
    if (lessonsToDelete.length > 0) {
      // Delete quizzes for removed lessons first
      await supabase
        .from("lesson_quiz")
        .delete()
        .in("lesson_id", lessonsToDelete);

      await supabase.from("lesson").delete().in("id", lessonsToDelete);
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

      let lessonId: string;

      if (lesson.id && existingLessonIds.has(lesson.id)) {
        // Update existing lesson
        await supabase
          .from("lesson")
          .update({
            ...lessonData,
            update_at: new Date().toISOString(),
          })
          .eq("id", lesson.id);
        lessonId = lesson.id;
      } else {
        // Create new lesson
        const { data: newLesson, error: newLessonError } = await supabase
          .from("lesson")
          .insert({
            ...lessonData,
            course_id: courseId,
          })
          .select("id")
          .single();

        if (newLessonError || !newLesson) {
          console.error("Failed to create lesson:", newLessonError?.message);
          continue;
        }
        lessonId = newLesson.id;
      }

      // Handle quizzes for this lesson
      const quizzes = lesson.quizzes || [];

      // Get existing quizzes for this lesson
      const { data: existingQuizzes } = await supabase
        .from("lesson_quiz")
        .select("id")
        .eq("lesson_id", lessonId);

      const existingQuizIds = new Set(existingQuizzes?.map((q) => q.id) || []);
      const providedQuizIds = new Set(
        quizzes.filter((q: any) => q.id).map((q: any) => q.id),
      );

      // Delete quizzes that are no longer in the list
      const quizzesToDelete = Array.from(existingQuizIds).filter(
        (id) => !providedQuizIds.has(id),
      );
      if (quizzesToDelete.length > 0) {
        await supabase.from("lesson_quiz").delete().in("id", quizzesToDelete);
      }

      // Upsert quizzes
      for (const quiz of quizzes) {
        if (!quiz.question) continue;

        const quizData = {
          question: quiz.question,
          option_a: quiz.option_a,
          option_b: quiz.option_b,
          option_c: quiz.option_c,
          option_d: quiz.option_d,
          correct_option: quiz.correct_option,
          quiz_index: quiz.quiz_index ?? 0,
          lesson_id: lessonId,
        };

        if (quiz.id && existingQuizIds.has(quiz.id)) {
          // Update existing quiz
          const { error: updateQuizError } = await supabase
            .from("lesson_quiz")
            .update(quizData)
            .eq("id", quiz.id);
          if (updateQuizError) {
            throw new Error(
              `Failed to update quiz: ${updateQuizError.message}`,
            );
          }
        } else {
          // Insert new quiz
          const { error: insertQuizError } = await supabase
            .from("lesson_quiz")
            .insert(quizData);
          if (insertQuizError) {
            throw new Error(
              `Failed to insert quiz: ${insertQuizError.message}`,
            );
          }
        }
      }
    }
  }
}

// Use AI to generate quizzes
const ytdlp = new YtDlp();
const outPutSchema = z.array(
  z.object({
    question: z.string(),
    option_a: z.string(),
    option_b: z.string(),
    option_c: z.string(),
    option_d: z.string(),
    correct_option: z.number(),
  }),
);
const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY,
});
export async function generateQuiz(lessonId: string, numQuestions: number = 3) {
  // Clamp to a sensible range
  const count = Math.max(1, Math.min(numQuestions, 10));

  const { data, error } = await supabase
    .from("lesson")
    .select("*")
    .eq("id", lessonId)
    .single();

  if (error) {
    throw new Error("Unknown database error occurred");
  }

  let subtitle: string | null = null;
  if (data.video_url) {
    try {
      const url = new URL(data.video_url);

      const info = await ytdlp.getInfoAsync(
        `https://www.youtube.com/watch?v=${url.searchParams.get("v")}`,
      );
      let subtitleUrl: string | null = null;
      // @ts-expect-error: yo
      for (const autoCap of info.automatic_captions.en) {
        if (autoCap.ext === "srt") {
          subtitleUrl = autoCap.url;
          break;
        }
      }
      if (subtitleUrl) {
        const res = await fetch(subtitleUrl);
        subtitle = await res.text();
      }
    } catch (e) {
      console.error("Failed to fetch video subtitles:", e);
      // Continue without subtitles — title + description are still available
    }
  }

  const systemPrompt = `You are an expert educational quiz designer for an online learning platform. Your task is to create high-quality multiple-choice questions that assess student comprehension of a lesson.

Guidelines:
- Generate exactly ${count} question${count > 1 ? "s" : ""}.
- Each question must have exactly 4 options (A, B, C, D) with exactly one correct answer.
- Questions should test understanding, not just rote memorization — include application and analysis-level questions when possible.
- Distribute the correct answer across options A–D roughly evenly; do NOT always make the same option correct.
- All incorrect options (distractors) must be plausible — avoid obviously wrong or joke answers.
- Keep question and option text concise but unambiguous.
- Cover different parts of the lesson content; avoid asking the same concept twice.
- If video subtitles are provided, use them as the primary source of content; the title and description provide additional context.`;

  let prompt = `## Lesson Information\n\n**Title:** ${data.title}\n`;

  if (data.description) {
    prompt += `\n**Description:**\n${data.description}\n`;
  }

  if (subtitle) {
    prompt += `\n**Video Transcript:**\n${subtitle}\n`;
  }

  prompt += `\nGenerate ${count} quiz question${count > 1 ? "s" : ""} based on the lesson content above.`;

  const { output } = await generateText({
    model: google("gemini-2.5-flash"),
    system: systemPrompt,
    output: Output.object({
      schema: outPutSchema,
    }),
    prompt,
  });

  return output;
}
