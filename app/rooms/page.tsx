import Layout from "@/components/Layout";
import CategoryCard from "@/components/CategoryCard";

interface Category {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  specs: Record<string, boolean>;
  essentialAmenities?: string[];
  bedType?: string | null;
  maxOccupancy?: number | null;
  roomSize?: string | null;
  roomCount: number;
  videoUrl?: string | null;
  images: Array<{
    id: number;
    url: string;
    caption: string | null;
  }>;
  prices?: Array<{
    id: number;
    hourlyHours: number;
    rateCents: number;
  }>;
}

async function getCategories() {
  try {
    const response = await fetch(
      `${
        process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
      }/api/categories`,
      {
        next: { revalidate: 300 },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch categories");
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}

export default async function RoomsPage() {
  const categories = await getCategories();

  return (
    <Layout>
      <div className="bg-white">
        {/* Hero Section */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 mt-10">
              Our Rooms
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Experience luxury and comfort in our carefully designed rooms
            </p>
          </div>
        </section>

        {/* Room Categories */}
        <section className="pb-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {categories && categories.length > 0 ? (
              <div className="flex justify-center">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl">
                  {categories.map((category: Category, index: number) => (
                    <div
                      key={category.id}
                      className="animate-fade-in-up w-full max-w-md mx-auto"
                      style={{ animationDelay: `${index * 200}ms` }}
                    >
                      <CategoryCard category={category} />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-12 max-w-md mx-auto">
                  <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                    No Rooms Available
                  </h3>
                  <p className="text-gray-600">
                    Please check back later for available rooms.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </Layout>
  );
}
