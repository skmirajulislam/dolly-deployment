/**
 * Utility functions for deleting files from Cloudinary
 */
import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

/**
 * Determine resource type from public ID or URL
 */
function determineResourceType(publicIdOrUrl: string): 'image' | 'video' {
    // Check for video extensions or patterns
    const videoExtensions = ['.mp4', '.mov', '.avi', '.wmv', '.flv', '.webm', '.mkv'];
    const lowerStr = publicIdOrUrl.toLowerCase();

    const isVideo = videoExtensions.some(ext => lowerStr.includes(ext)) ||
        lowerStr.includes('/video/') ||
        lowerStr.includes('video');

    return isVideo ? 'video' : 'image';
}

/**
 * Delete a single file from Cloudinary
 */
export async function deleteFromCloudinary(publicId: string, resourceType?: 'image' | 'video') {
    try {
        // Auto-determine resource type if not provided
        const finalResourceType = resourceType || determineResourceType(publicId);

        // Delete directly from Cloudinary instead of using internal API
        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: finalResourceType
        })

        if (result.result === 'ok') {
            return true
        } else {
            console.error(`Cloudinary deletion failed for ${publicId}:`, result)
            return false
        }
    } catch (error) {
        console.error(`Cloudinary deletion error for ${publicId}:`, error)
        return false
    }
}

/**
 * Delete multiple files from Cloudinary
 */
export async function bulkDeleteFromCloudinary(publicIds: string[], resourceType?: 'image' | 'video') {
    const results = await Promise.allSettled(
        publicIds.map(publicId => deleteFromCloudinary(publicId, resourceType))
    )

    const successes = results.filter(result => result.status === 'fulfilled' && result.value).length
    const failures = results.length - successes

    console.log(`Cloudinary bulk deletion: ${successes} successful, ${failures} failed`)

    return {
        total: results.length,
        successes,
        failures,
        results
    }
}

/**
 * Extract public ID from Cloudinary URL
 */
export function extractPublicIdFromUrl(cloudinaryUrl: string): string | null {
    try {
        // Match patterns like:
        // https://res.cloudinary.com/cloud-name/image/upload/v1234567890/folder/public-id.jpg
        // https://res.cloudinary.com/cloud-name/video/upload/v1234567890/folder/public-id.mp4
        const match = cloudinaryUrl.match(/\/(?:image|video)\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/)
        return match ? match[1] : null
    } catch (error) {
        console.error('Error extracting public ID from URL:', error)
        return null
    }
}


/**
 * Determine resource type from Cloudinary URL
 */
export function getResourceTypeFromUrl(cloudinaryUrl: string): 'image' | 'video' {
    try {
        // Check if URL contains '/video/' or has video file extensions
        if (cloudinaryUrl.includes('/video/') || /\.(mp4|mov|avi|wmv|flv|webm|mkv)$/i.test(cloudinaryUrl)) {
            return 'video'
        }
        // Default to image for all other cases (including '/image/' and image extensions)
        return 'image'
    } catch (error) {
        console.error('Error determining resource type from URL:', error)
        return 'image' // Default fallback
    }
}