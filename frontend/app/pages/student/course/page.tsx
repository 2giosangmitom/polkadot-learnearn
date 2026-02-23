'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { Course } from '@/types/course';
import { useWallet } from '@/lib/hooks';
import { Card, Button, Badge } from '@/components/SharedUI';
import Modal, { useModal } from '@/components/Modal';

export default function CourseMarketplace() {
	const router = useRouter();
	const { address, isConnected } = useWallet();
	const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
	const [loading, setLoading] = useState(true);
	const [processingPurchase, setProcessingPurchase] = useState<string | null>(null);
	const { modalState, showModal, hideModal } = useModal();

	useEffect(() => {
		let abort = false;

		async function loadCourses() {
			try {
				// Get all courses
				const coursesRes = await fetch('/api/courses');
				const coursesData = await coursesRes.json();
				
				if (!coursesRes.ok) {
					console.error('Failed to load courses:', coursesData.error);
					if (!abort) setLoading(false);
					return;
				}

				const allCourses = coursesData.courses || [];

				// If wallet connected, filter out enrolled courses
				if (isConnected && address) {
					const purchasesRes = await fetch(`/api/purchases?wallet_address=${encodeURIComponent(address as string)}`);
					if (purchasesRes.ok) {
						const purchasesData = await purchasesRes.json();
						const purchasedIds = new Set(purchasesData.courseIds || []);
						const available = allCourses.filter((c: Course) => !purchasedIds.has(c.id));
						if (!abort) {
							setAvailableCourses(available);
							setLoading(false);
						}
						return;
					}
				}

				// If not connected or can't get purchases, show all courses
				if (!abort) {
					setAvailableCourses(allCourses);
					setLoading(false);
				}
			} catch (err) {
				console.error('Failed to load courses:', err);
				if (!abort) setLoading(false);
			}
		}

		loadCourses();

		return () => {
			abort = true;
		};
	}, [address, isConnected]);

	const handleBuyCourse = async (course: Course) => {
		if (!isConnected || !address) {
			showModal('Please connect your wallet first.', {
				type: 'warning',
				title: 'Wallet Not Connected',
				onConfirm: () => {
					router.push('/pages/login');
				}
			});
			return;
		}

		setProcessingPurchase(course.id);

		try {
			// First enrollment attempt without payment proof
			const res = await fetch(`/api/courses/${course.id}/enroll`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ 
					walletAddress: address,
				}),
			});

			// Handle 402 Payment Required
			if (res.status === 402) {
				const data = await res.json();
				const paymentInfo = data.payment;

				console.log('🔴 402 Payment Required:', paymentInfo);
				console.log('📋 X-Payment-Required header:', res.headers.get('X-Payment-Required'));

				if (!paymentInfo || !paymentInfo.recipient) {
					throw new Error('Invalid payment information received from server');
				}

				// Send payment via Polkadot
				const { sendPayment } = await import('@/lib/polkadot');
				const paymentResult = await sendPayment(
					address,
					paymentInfo.recipient,
					course.cost || 0
				);

				console.log('✅ Payment sent:', paymentResult);

				// Verify enrollment with payment proof
				const verifyRes = await fetch(`/api/courses/${course.id}/enroll`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						walletAddress: address,
						paymentProof: {
							transactionHash: paymentResult.transactionHash,
							blockHash: paymentResult.blockHash,
						},
					}),
				});

				const verifyData = await verifyRes.json();

				if (!verifyRes.ok) {
					throw new Error(verifyData.error || verifyData.message || 'Failed to verify payment');
				}

				if (verifyData.success) {
					console.log('✅ Enrolled successfully!');
					showModal('Course enrollment successful!', {
						type: 'success',
						title: 'Success',
						onConfirm: () => {
							router.push(`/pages/student/course/${course.id}`);
						}
					});
					return;
				}

				throw new Error(verifyData.error || verifyData.message || 'Enrollment failed');
			}

			// Handle other responses
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.error || 'Enrollment failed');
			}

			// Success (already enrolled or free course)
			const data = await res.json();
			if (data.success) {
				console.log('✅ Enrolled successfully!');
				showModal('Course enrollment successful!', {
					type: 'success',
					title: 'Success',
					onConfirm: () => {
						router.push(`/pages/student/course/${course.id}`);
					}
				});
			}
		} catch (error) {
			console.error('Enrollment error:', error);
			const errorMsg = (error as Error).message;
			showModal(errorMsg, {
				type: 'error',
				title: 'Enrollment Error'
			});
		} finally {
			setProcessingPurchase(null);
		}
	};

	return (
		<Layout userRole="student">
			<div className="space-y-8">
				<div className="flex justify-between items-end">
					<div>
						<h1 className="text-3xl font-extrabold text-white tracking-tight">Course Marketplace</h1>
						<p className="text-neutral-400 mt-2 text-lg">Invest in knowledge. Complete milestones to earn rewards.</p>
					</div>
				</div>

				{loading ? (
					<div className="flex items-center justify-center py-12">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
					</div>
				) : availableCourses.length === 0 ? (
					<div className="rounded-lg border border-dashed border-neutral-700 bg-neutral-900/50 p-8 text-center text-neutral-400">
						{isConnected 
							? "You've enrolled in all available courses! Check your dashboard."
							: "No courses available. Come back later."}
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{availableCourses.map((course) => (
							<Card key={course.id} className="flex flex-col h-full border border-neutral-800 hover:border-indigo-500/50 transition-all">
								<div className="p-6 flex flex-col flex-1">
									<div className="flex items-start justify-between mb-4">
										<h3 className="text-xl font-bold text-white">{course.title}</h3>
										{course.cost && (
										<Badge variant="primary">{course.cost} PAS</Badge>
										)}
									</div>
									<p className="text-neutral-400 text-sm mb-6 flex-1 line-clamp-3">
										{course.description || 'No description available'}
									</p>
									
									<div className="mt-auto space-y-3">
										<div className="flex items-center justify-between pt-4 border-t border-neutral-800/50">
											<span className="font-bold text-xl text-indigo-400">
												{course.cost ? `${course.cost} PAS` : 'Free'}
											</span>
											<Button 
												onClick={() => handleBuyCourse(course)}
												disabled={processingPurchase === course.id}
											>
												{processingPurchase === course.id ? 'Processing...' : 'Enroll Now'}
											</Button>
										</div>
									</div>
								</div>
							</Card>
						))}
					</div>
				)}
			</div>

			<Modal
				isOpen={modalState.isOpen}
				onClose={hideModal}
				message={modalState.message}
				title={modalState.title}
				type={modalState.type}
				confirmText={modalState.confirmText}
				showCancel={modalState.showCancel}
				cancelText={modalState.cancelText}
				onConfirm={modalState.onConfirm}
			/>
		</Layout>
	);
}
