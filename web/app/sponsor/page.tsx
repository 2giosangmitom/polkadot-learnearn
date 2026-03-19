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
  const [isProcessing, setIsProcessing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
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
  const handleSponsorClick = async (course: Course) => {
    // Prevent multiple clicks
    if (isProcessing) {
      return;
    }

    setIsProcessing(true);

    try {
      if (!signer) {
        toast.error("Please connect your wallet first");
        try {
          await connect();
        } catch (error) {
          console.error("Failed to connect:", error);
        }
        return;
      }

      if (!isCorrectNetwork) {
        toast.info("Switching to correct network...");
        try {
          await switchNetwork();
          // Wait a bit for network to switch
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error("Failed to switch network:", error);
          toast.error("Please switch to the correct network manually");
          return;
        }
      }

      setSelectedCourse(course);
      setIsModalOpen(true);
    } finally {
      // Reset processing state after a short delay
      setTimeout(() => setIsProcessing(false), 500);
    }
  };

  const handleSponsorSubmit = async (course: Course, amount: string) => {
    if (!signer || !metamaskAddress) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!isCorrectNetwork) {
      toast.error("Please switch to the correct network");
      return;
    }

    if (!course.course_pool_address) {
      toast.error("Course pool address not found");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      const loadingToast = toast.loading("Processing sponsorship...");
      
      // Convert amount to wei (assuming amount is in ETH/PAS)
      const { parseEther } = await import("ethers");
      const amountInWei = parseEther(amount);
      
      await sponsorCoursePool(
        course.course_pool_address,
        signer,
        amountInWei.toString()
      );
      
      toast.dismiss(loadingToast);
      toast.success(`Successfully sponsored ${course.title} with ${amount} PAS!`);
      setIsModalOpen(false);
      
      // Trigger refresh for all course cards
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error("Error sponsoring course pool:", error);
      toast.error("Failed to sponsor course: " + (error instanceof Error ? error.message : "Unknown error"));
    }
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
            refreshTrigger={refreshTrigger}
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