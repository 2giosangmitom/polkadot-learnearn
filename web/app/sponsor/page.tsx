"use client";

import { useState, useEffect } from "react";
import { HeroSection } from "@/components/sponsor/hero-section";
import { CourseGrid } from "@/components/sponsor/course-grid";
import { SponsorModal } from "@/components/sponsor/sponsor-modal";
import { CTASection } from "@/components/sponsor/cta-section";
import { Course } from "@/components/sponsor/course-card";
import { useWalletProvider } from "@/hooks/use-wallet-provider";
import { sponsorCoursePool } from "@/helper/course-pool";
import { toast } from "sonner";

export default function SponsorPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
const { signer, metamaskAddress, connect, isCorrectNetwork, switchNetwork } = useWalletProvider();
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/courses');
        
        if (!response.ok) {
          throw new Error('Failed to fetch courses');
        }
        
        const apiCourses: Course[] = await response.json();
        setCourses(apiCourses);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  // Scroll to investment deck section
  const scrollToInvestmentDeck = () => {
    const element = document.getElementById('investment-deck');
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  // Handle sponsor modal
  const handleSponsorClick = (course: Course) => {
    setSelectedCourse(course);
      const handleSponsorClick = () => {
    try {
    if (!signer) {
      connect();
      const res = sponsorCoursePool(course.course_pool_address!, metamaskAddress!);
      toast.success("Sponsorship successful!");
      return;
    }
    } catch (error) {
      console.error("Error sponsoring course pool:", error);
      toast.error("Failed to sponsor course: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  }
    setIsModalOpen(true);
  };

  const handleSponsorSubmit = async (course: Course, amount: string) => {
    // Here you would integrate with your smart contract or API
    console.log('Sponsoring course:', course.id, 'with amount:', amount);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Show success message (you could add a toast notification here)
    alert(`Successfully sponsored ${course.title} with ${amount} PAS!`);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <HeroSection onViewInvestmentDeck={scrollToInvestmentDeck} />

      {/* Available Courses Section */}
      <section id="investment-deck" className="py-24 px-4 bg-muted/30">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
              Choose Courses to Sponsor
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Sponsoring for the future of Web3 Education
            </p>
          </div>

          <CourseGrid
            courses={courses}
            loading={loading}
            error={error}
            onSponsor={handleSponsorClick}
          />
        </div>
      </section>

      <CTASection />

      <SponsorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        course={selectedCourse}
        onSponsor={handleSponsorSubmit}
      />
    </div>
  );
}