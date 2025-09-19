import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary with environment variables
cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Validate Cloudinary configuration
function validateCloudinaryConfig() {
    const { cloud_name, api_key, api_secret } = cloudinary.config()

    if (!cloud_name || !api_key || !api_secret) {
        const missing = []
        if (!cloud_name) missing.push('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME')
        if (!api_key) missing.push('CLOUDINARY_API_KEY')
        if (!api_secret) missing.push('CLOUDINARY_API_SECRET')

        throw new Error(`Missing Cloudinary environment variables: ${missing.join(', ')}`)
    }
}

export async function POST(request: NextRequest) {
    try {
        // Validate Cloudinary configuration first
        validateCloudinaryConfig()

        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        // Validate file type - allow both images and videos for room management
        const isImage = file.type.startsWith('image/')
        const isVideo = file.type.startsWith('video/')

        if (!isImage && !isVideo) {
            return NextResponse.json({ error: 'Only image and video files are allowed' }, { status: 400 })
        }

        // Additional validation for videos
        if (isVideo) {
            // Check file size (approximate check for 60s video limit)
            const maxVideoSize = 50 * 1024 * 1024 // 50MB (rough estimate for 60s video)
            if (file.size > maxVideoSize) {
                return NextResponse.json({
                    error: 'Video file too large. Please ensure video is under 60 seconds.'
                }, { status: 400 })
            }
        }

        // Convert file to buffer
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Determine resource type for Cloudinary
        const resourceType = isVideo ? 'video' : 'image'

        // Upload to Cloudinary
        const result = await new Promise<{
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
                    resource_type: resourceType,
                    folder: 'dolly-hotel',
                    transformation: resourceType === 'image' ? [
                        { width: 1200, height: 800, crop: 'limit', quality: 'auto' }
                    ] : [
                        { width: 1280, height: 720, crop: 'limit', quality: 'auto', duration: '60' }
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

        return NextResponse.json({
            secure_url: result.secure_url,
            public_id: result.public_id,
            resource_type: result.resource_type,
            format: result.format,
            width: result.width,
            height: result.height,
            bytes: result.bytes,
            success: true
        })

    } catch (error) {
        console.error('Upload error:', error)

        // Provide more specific error messages
        if (error instanceof Error) {
            if (error.message.includes('Missing Cloudinary')) {
                return NextResponse.json(
                    { error: error.message },
                    { status: 500 }
                )
            }
            if (error.message.includes('Invalid API key')) {
                return NextResponse.json(
                    { error: 'Invalid Cloudinary configuration. Please check your API credentials.' },
                    { status: 500 }
                )
            }
        }

        return NextResponse.json(
            { error: 'Upload failed. Please check your Cloudinary configuration.' },
            { status: 500 }
        )
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const publicId = searchParams.get('publicId')
        const resourceType = searchParams.get('resourceType') || 'image'

        if (!publicId) {
            return NextResponse.json({ error: 'Public ID is required' }, { status: 400 })
        }

        // Delete from Cloudinary
        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType as 'image' | 'video' | 'raw' | 'auto'
        })

        if (result.result === 'ok') {
            return NextResponse.json({
                success: true,
                message: 'File deleted successfully',
                public_id: publicId
            })
        } else {
            return NextResponse.json({
                error: 'Failed to delete file from Cloudinary',
                result: result.result
            }, { status: 400 })
        }

    } catch (error) {
        console.error('Delete error:', error)
        return NextResponse.json(
            { error: 'Delete failed. Please check your Cloudinary configuration.' },
            { status: 500 }
        )
    }
}