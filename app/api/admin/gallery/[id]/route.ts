import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { uploadToCloudinary } from '@/lib/cloudinary'
import { galleryImageSchema } from '@/lib/validators'
import cloudinary from '@/lib/cloudinary'
import prisma from '@/lib/prisma'

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await requireAdmin()
        const { id } = await params

        // Find the existing image
        const existingImage = await prisma.galleryImage.findUnique({
            where: { id: parseInt(id) },
        })

        if (!existingImage) {
            return NextResponse.json(
                { error: 'Image not found' },
                { status: 404 }
            )
        }

        const formData = await request.formData()
        const file = formData.get('file') as File | null
        const category = formData.get('category') as string
        const caption = formData.get('caption') as string
        const categoryId = formData.get('categoryId') as string

        // Validate data
        const validatedData = galleryImageSchema.parse({
            category,
            caption: caption || undefined,
            categoryId: categoryId ? parseInt(categoryId) : undefined,
        })

        let finalUpdateData: {
            category: string;
            caption?: string | null;
            categoryId?: number | null;
            url?: string;
            publicId?: string;
        } = {
            category: validatedData.category,
            caption: validatedData.caption,
            categoryId: validatedData.categoryId,
        }

        // If a new file is provided, upload it and delete the old one
        if (file) {
            // Convert file to buffer
            const bytes = await file.arrayBuffer()
            const buffer = Buffer.from(bytes)

            // Upload new image to Cloudinary
            const uploadResult = await uploadToCloudinary(buffer, {
                folder: 'dolly-hotel/gallery',
                public_id: `${category.toLowerCase()}-${Date.now()}`,
            }) as { secure_url: string; public_id: string }

            // Delete old image from Cloudinary
            try {
                await cloudinary.uploader.destroy(existingImage.publicId)
            } catch (cloudinaryError) {
                console.error('Cloudinary deletion error:', cloudinaryError)
                // Continue with update even if old image deletion fails
            }

            finalUpdateData = {
                ...finalUpdateData,
                url: uploadResult.secure_url,
                publicId: uploadResult.public_id,
            }
        }

        // Update in database
        const updatedImage = await prisma.galleryImage.update({
            where: { id: parseInt(id) },
            data: finalUpdateData,
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
            data: updatedImage,
        })
    } catch (error) {
        if (error instanceof Error && error.message.includes('Unauthorized')) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        console.error('Admin gallery update error:', error)
        return NextResponse.json(
            { error: 'Failed to update image' },
            { status: 500 }
        )
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await requireAdmin()
        const { id } = await params

        // Find the image first
        const image = await prisma.galleryImage.findUnique({
            where: { id: parseInt(id) },
        })

        if (!image) {
            return NextResponse.json(
                { error: 'Image not found' },
                { status: 404 }
            )
        }

        // Delete from Cloudinary directly
        try {
            const result = await cloudinary.uploader.destroy(image.publicId, {
                resource_type: 'auto'
            })

            if (result.result !== 'ok') {
                console.error('Cloudinary deletion failed:', result)
                // Continue with database deletion even if Cloudinary fails
            }
        } catch (cloudinaryError) {
            console.error('Cloudinary deletion error:', cloudinaryError)
            // Continue with database deletion even if Cloudinary fails
        }

        // Delete from database
        await prisma.galleryImage.delete({
            where: { id: parseInt(id) },
        })

        return NextResponse.json({
            success: true,
            message: 'Image deleted successfully',
        })
    } catch (error) {
        if (error instanceof Error && error.message.includes('Unauthorized')) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        console.error('Admin gallery delete error:', error)
        return NextResponse.json(
            { error: 'Failed to delete image' },
            { status: 500 }
        )
    }
}