import Layout from '@/components/Layout'
import PriceTable from '@/components/PriceTable'

export default function PricesPage() {
    return (
        <Layout>
            <div className="bg-white">
                <section className="py-16 bg-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                            Room Pricing
                        </h1>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                            Transparent and competitive pricing for all our room categories.
                        </p>
                    </div>
                </section>

                <section className="pb-20 bg-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <PriceTable />
                    </div>
                </section>
            </div>
        </Layout>
    )
}
