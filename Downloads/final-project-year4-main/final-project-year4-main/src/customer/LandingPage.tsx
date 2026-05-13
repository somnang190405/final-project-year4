
import React from "react";
import { useNavigate } from "react-router-dom";
import { Truck, Shield, Award, Star } from "lucide-react";
import "./LandingPage.css";

const LandingPage: React.FC = () => {
	const navigate = useNavigate();

	const categories = [
		{ id: 1, name: "Men's Fashion", icon: "👔", color: "from-blue-400 to-blue-600" },
		{ id: 2, name: "Women's Fashion", icon: "👗", color: "from-pink-400 to-pink-600" },
		{ id: 3, name: "Accessories", icon: "👜", color: "from-purple-400 to-purple-600" },
		{ id: 4, name: "Footwear", icon: "👞", color: "from-orange-400 to-orange-600" },
	];

	const features = [
		{
			icon: <Truck className="w-8 h-8 text-indigo-600" />,
			title: "Free Shipping",
			description: "On orders over $50",
		},
		{
			icon: <Shield className="w-8 h-8 text-indigo-600" />,
			title: "100% Secure",
			description: "SSL encrypted checkout",
		},
		{
			icon: <Award className="w-8 h-8 text-indigo-600" />,
			title: "Quality Guaranteed",
			description: "Premium products only",
		},
		{
			icon: <Star className="w-8 h-8 text-indigo-600" />,
			title: "Expert Curation",
			description: "Hand-picked items",
		},
	];

	return (
		<div className="landing-page-container">
			{/* Hero Section - Professional Full Screen Design */}
			<section className="hero-section relative w-full h-screen overflow-hidden bg-gray-900">
				{/* Background Image Container */}
				<div className="absolute inset-0">
					{/* Background - Replace with actual image URL */}
					<div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 opacity-90"></div>
					<div className="absolute inset-0 bg-cover bg-center bg-no-repeat" 
						 style={{
							backgroundImage: 'url("https://images.unsplash.com/photo-1525887357457-c2645fe2798f?w=1200&h=800&fit=crop")',
						 }}>
					</div>
					
					{/* Dark Overlay for Text Contrast */}
					<div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30"></div>
					
					{/* Animated Background Elements */}
					<div className="absolute top-20 right-20 w-72 h-72 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
					<div className="absolute bottom-20 left-20 w-96 h-96 bg-gradient-to-tr from-pink-500/10 to-orange-500/10 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
				</div>

				{/* Main Content */}
				<div className="absolute inset-0 flex flex-col justify-between">
					{/* Header Area */}
					<div className="pt-12 sm:pt-16 md:pt-20 px-6 sm:px-12 lg:px-20">
						{/* Trending Badge */}
						<div className="inline-flex items-center gap-2 mb-6 md:mb-8 animate-fade-in">
							<div className="w-3 h-3 bg-gradient-to-r from-pink-400 to-red-500 rounded-full animate-pulse"></div>
							<span className="text-xs md:text-sm font-bold tracking-widest text-white uppercase opacity-90">
								🔥 Trending Collection
							</span>
						</div>
					</div>

					{/* Main Content */}
					<div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-20 py-12 sm:py-20">
						{/* Headline */}
						<div className="max-w-3xl animate-slide-in-left">
							<p className="text-sm md:text-base font-semibold text-pink-400 mb-3 tracking-widest uppercase">
								Discover the Latest Trends
							</p>
							<h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white mb-6 leading-none drop-shadow-2xl">
								Premium
								<br />
								Fashion
								<br />
								<span className="bg-gradient-to-r from-pink-400 via-red-400 to-orange-400 bg-clip-text text-transparent">
									Collection
								</span>
							</h1>
							
							{/* Subheadline */}
							<p className="text-lg md:text-xl text-gray-200 mb-8 max-w-lg leading-relaxed drop-shadow-lg">
								Elevate your style with our exclusive curated selection of premium fashion pieces. Limited time offer with up to 50% off.
							</p>

							{/* CTA Buttons */}
							<div className="flex flex-col sm:flex-row gap-4 pt-4 animate-slide-in-up">
								<button
									onClick={() => navigate("/shop")}
									className="group relative px-8 py-4 md:py-5 bg-gradient-to-r from-pink-500 to-red-500 text-white font-bold rounded-xl hover:shadow-2xl hover:shadow-red-500/50 transition-all duration-300 transform hover:scale-105 text-base md:text-lg w-fit overflow-hidden"
								>
									<span className="relative z-10 flex items-center gap-2">
										Shop Now
										<svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
										</svg>
									</span>
								</button>
								<button
									onClick={() => navigate("/shop")}
									className="px-8 py-4 md:py-5 bg-white/10 backdrop-blur-md border-2 border-white text-white font-bold rounded-xl hover:bg-white/20 transition-all duration-300 transform hover:scale-105 text-base md:text-lg w-fit"
								>
									Browse Collection
								</button>
							</div>
						</div>
					</div>

					{/* Bottom Info Bar */}
					<div className="px-6 sm:px-12 lg:px-20 py-10 sm:py-12 border-t border-white/10 bg-gradient-to-t from-black/50 to-transparent">
						<div className="max-w-4xl grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
							<div className="animate-fade-in">
								<p className="text-2xl md:text-3xl font-black text-white">1000+</p>
								<p className="text-xs md:text-sm text-gray-300 mt-1">Premium Items</p>
							</div>
							<div className="animate-fade-in animation-delay-100">
								<p className="text-2xl md:text-3xl font-black text-white">50K+</p>
								<p className="text-xs md:text-sm text-gray-300 mt-1">Happy Customers</p>
							</div>
							<div className="animate-fade-in animation-delay-200">
								<p className="text-2xl md:text-3xl font-black text-white">4.9★</p>
								<p className="text-xs md:text-sm text-gray-300 mt-1">Avg. Rating</p>
							</div>
							<div className="animate-fade-in animation-delay-300">
								<p className="text-2xl md:text-3xl font-black text-white">24/7</p>
								<p className="text-xs md:text-sm text-gray-300 mt-1">Support</p>
							</div>
						</div>
					</div>
				</div>

				{/* Scroll Indicator */}
				<div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
					<svg className="w-6 h-6 text-white opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
					</svg>
				</div>
			</section>

			{/* Trust Indicators */}
			<section className="bg-white py-12">
				<div className="max-w-6xl mx-auto px-6">
					<div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-6">
						{features.map((feature, idx) => (
							<div
								key={idx}
								className="flex flex-col items-center text-center p-6 rounded-xl hover:bg-gray-50 transition-colors duration-300"
							>
								<div className="mb-3">{feature.icon}</div>
								<h3 className="font-bold text-gray-900 mb-1">{feature.title}</h3>
								<p className="text-sm text-gray-600">{feature.description}</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Category Cards Grid */}
			<section className="bg-gradient-to-b from-gray-50 to-white py-20">
				<div className="max-w-6xl mx-auto px-6">
					<div className="text-center mb-16">
						<h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
							Shop by Category
						</h2>
						<p className="text-lg text-gray-600 max-w-2xl mx-auto">
							Explore our curated collections of fashion and lifestyle products.
						</p>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
						{categories.map((category) => (
							<button
								key={category.id}
								onClick={() => navigate("/shop")}
								className={`group relative overflow-hidden rounded-2xl h-48 bg-gradient-to-br ${category.color} p-6 text-white font-bold text-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 cursor-pointer`}
							>
								<div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
								<div className="relative z-10 flex flex-col h-full justify-between">
									<div className="text-5xl">{category.icon}</div>
									<h3 className="text-xl">{category.name}</h3>
								</div>
								<div className="absolute bottom-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
									<svg className="w-16 h-16 text-white/20" fill="currentColor" viewBox="0 0 24 24">
										<path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" fill="none" />
									</svg>
								</div>
							</button>
						))}
					</div>
				</div>
			</section>

			{/* Features Section */}
			<section className="bg-gradient-to-r from-indigo-600 to-purple-600 py-20">
				<div className="max-w-6xl mx-auto px-6">
					<div className="text-center mb-16">
						<h2 className="text-4xl font-bold text-white mb-4">
							Why Choose TinhMe?
						</h2>
						<p className="text-lg text-indigo-100 max-w-2xl mx-auto">
							Experience shopping like never before with our commitment to quality and customer satisfaction.
						</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
						<div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 hover:bg-white/20 transition-all duration-300 border border-white/20">
							<div className="text-4xl mb-4">✨</div>
							<h3 className="text-xl font-bold text-white mb-3">Curated Collections</h3>
							<p className="text-indigo-100">
								Every item is carefully selected to ensure quality and style that matches current trends.
							</p>
						</div>

						<div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 hover:bg-white/20 transition-all duration-300 border border-white/20">
							<div className="text-4xl mb-4">🚚</div>
							<h3 className="text-xl font-bold text-white mb-3">Fast Delivery</h3>
							<p className="text-indigo-100">
								Get your items delivered quickly with our reliable shipping partners.
							</p>
						</div>

						<div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 hover:bg-white/20 transition-all duration-300 border border-white/20">
							<div className="text-4xl mb-4">💝</div>
							<h3 className="text-xl font-bold text-white mb-3">Easy Returns</h3>
							<p className="text-indigo-100">
								Not satisfied? Return within 30 days for a full refund, no questions asked.
							</p>
						</div>
					</div>
				</div>
			</section>

			{/* Bottom CTA */}
			<section className="bg-white py-20">
				<div className="max-w-4xl mx-auto px-6 text-center">
					<h2 className="text-4xl font-bold text-gray-900 mb-6">
						Ready to Transform Your Wardrobe?
					</h2>
					<p className="text-lg text-gray-600 mb-10 max-w-2xl mx-auto">
						Start shopping today and discover amazing deals on premium fashion items.
					</p>
					<button
						onClick={() => navigate("/shop")}
						className="px-10 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:shadow-2xl hover:shadow-indigo-500/50 transition-all duration-300 transform hover:scale-105 inline-flex items-center gap-2"
					>
						<span>Start Shopping</span>
						<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
						</svg>
					</button>
				</div>
			</section>
		</div>
	);
};

export default LandingPage;
