import Link from 'next/link'

export default function NotFound() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="max-w-md p-6 bg-white rounded-lg shadow-lg">
                <h2 className="text-3xl font-bold text-gray-800 mb-4">Not Found</h2>
                <p className="text-lg text-gray-600 mb-6">Could not find requested resource</p>
                <Link href="/" className="inline-block px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-300">
                    Return Home
                </Link>
            </div>
        </div>
    )
}