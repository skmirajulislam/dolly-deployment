import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { galleryImageSchema } from '@/lib/validators'
import prisma from '@/lib/prisma'
import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary with environment variables
cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function GET() {
    try {
        await requireAdmin()

        const images = await prisma.galleryImage.findMany({
            include: {
                hotelCategory: {
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        })

        return NextResponse.json({
            success: true,
            data: images,
        })
    } catch (error) {
        if (error instanceof Error && error.message.includes('Unauthorized')) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        console.error('Admin gallery fetch error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch gallery images' },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        await requireAdmin()

        const contentType = request.headers.get('content-type')

        if (contentType?.includes('application/json')) {
            // Handle JSON request (file already uploaded to Cloudinary)
            const { category, caption, url, publicId, categoryId } = await request.json()

            if (!url || !publicId) {
                return NextResponse.json(
                    { error: 'URL and public ID are required' },
                    { status: 400 }
                )
            }

            // Validate data
            const validatedData = galleryImageSchema.parse({
                category,
                caption: caption || undefined,
                categoryId: categoryId ? parseInt(categoryId) : undefined,
            })

            // Save to database (file already uploaded)
            const image = await prisma.galleryImage.create({
                data: {
                    category: validatedData.category,
                    url: url,
                    publicId: publicId,
                    caption: validatedData.caption,
                    categoryId: validatedData.categoryId,
                },
                include: {
                    hotelCategory: {
                        select: {
                            id: true,
                            title: true,
                            slug: true,
                        },
                    },
                },
            })

            return NextResponse.json({
                success: true,
                data: image,
            })
        } else {
            // Handle FormData request (upload file here)
            const formData = await request.formData()
            const file = formData.get('file') as File
            const category = formData.get('category') as string
            const caption = formData.get('caption') as string
            const categoryId = formData.get('categoryId') as string

            if (!file) {
                return NextResponse.json(
                    { error: 'No file provided' },
                    { status: 400 }
                )
            }

            // Validate file type - only allow images
            if (!file.type.startsWith('image/')) {
                return NextResponse.json(
                    { error: 'Only image files are allowed' },
                    { status: 400 }
                )
            }

            // Validate data
            const validatedData = galleryImageSchema.parse({
                category,
                caption: caption || undefined,
                categoryId: categoryId ? parseInt(categoryId) : undefined,
            })

            // Upload to Cloudinary directly instead of internal API call
            // Convert file to buffer
            const bytes = await file.arrayBuffer()
            const buffer = Buffer.from(bytes)

            // Upload to Cloudinary
            const uploadResult = await new Promise<{
                secure_url: string;
                public_id: string;
                resource_type: string;
                format: string;
                width: number;
                height: number;
                bytes: number;
            }>((resolve, reject) => {
                cloudinary.uploader.upload_stream(
                    {
                        resource_type: 'image',
                        folder: 'dolly-hotel',
                        transformation: [
                            { width: 1200, height: 800, crop: 'limit', quality: 'auto' }
                        ]
                    },
                    (error, result) => {
                        if (error) {
                            console.error('Cloudinary error:', error)
                            reject(error)
                        } else if (result) {
                            resolve(result)
                        } else {
                            reject(new Error('Upload failed - no result'))
                        }
                    }
                ).end(buffer)
            })

            // Save to database
            const image = await prisma.galleryImage.create({
                data: {
                    category: validatedData.category,
                    url: uploadResult.secure_url,
                    publicId: uploadResult.public_id,
                    caption: validatedData.caption,
                    categoryId: validatedData.categoryId,
                },
                include: {
                    hotelCategory: {
                        select: {
                            id: true,
                            title: true,
                            slug: true,
                        },
                    },
                },
            })

            return NextResponse.json({
                success: true,
                data: image,
            })
        }
    } catch (error) {
        if (error instanceof Error && error.message.includes('Unauthorized')) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        console.error('Admin gallery upload error:', error)
        return NextResponse.json(
            { error: 'Failed to upload image' },
            { status: 500 }
        )
    }
}