'use client';

import CreateCourseForm from "@/components/course/CreateCourseForm";
import { Layout } from "@/components/Layout";

export default function Page() {
  return (
    <Layout userRole="teacher">
      <CreateCourseForm />
    </Layout>
  );
}