import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractPublicIdFromUrl, getResourceTypeFromUrl } from "@/lib/cloudinary-delete";

// GET - Fetch all rooms (categories)
export async function GET() {
    try {
        const rooms = await prisma.hotelCategory.findMany({
            include: {
                images: {
                    orderBy: { createdAt: 'asc' }
                },
                prices: {
                    orderBy: { hourlyHours: 'asc' }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Debug: Log video URLs
        rooms.forEach(room => {
            if (room.videoUrl) {
                console.log('Room with video in DB:', room.title, 'Video URL:', room.videoUrl);
            }
        });

        return NextResponse.json(rooms);
    } catch (error) {
        console.error("Error fetching rooms:", error);
        return NextResponse.json(
            { error: "Failed to fetch rooms" },
            { status: 500 }
        );
    }
}

// POST - Create a new room
export async function POST(request: NextRequest) {
    try {
        const data = await request.json();

        const {
            title,
            description,
            specs,
            essentialAmenities,
            roomCount,
            images,
            videos
        } = data;

        // Debug: Log video data being received
        console.log('Creating room:', title);
        console.log('Videos received:', videos);
        console.log('Video URL to store:', videos && videos.length > 0 ? videos[0].url : null);

        // Generate slug from title
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        // Create room (hotel category) with images
        const room = await prisma.hotelCategory.create({
            data: {
                slug,
                title,
                description: description || '',
                specs,
                essentialAmenities: essentialAmenities || [],
                roomCount: roomCount || 0,
                videoUrl: videos && videos.length > 0 ? videos[0].url : null,
                images: {
                    create: images?.map((imageData: { url: string, publicId: string }, index: number) => ({
                        category: 'Rooms',
                        url: imageData.url,
                        publicId: imageData.publicId,
                        caption: `${title} - Image ${index + 1}`
                    })) || []
                }
            },
            include: {
                images: true,
                prices: true
            }
        });

        return NextResponse.json(room, { status: 201 });
    } catch (error) {
        console.error("Error creating room:", error);
        return NextResponse.json(
            { error: "Failed to create room" },
            { status: 500 }
        );
    }
}

// PUT - Update a room
export async function PUT(request: NextRequest) {
    try {
        const data = await request.json();
        const {
            id,
            title,
            description,
            specs,
            essentialAmenities,
            roomCount,
            images,
            videos
        } = data;

        // Debug: Log video data being received for update
        console.log('Updating room:', title);
        console.log('Videos received for update:', videos);
        console.log('Video URL to store for update:', videos && videos.length > 0 ? videos[0].url : null);

        if (!id) {
            return NextResponse.json(
                { error: "Room ID is required" },
                { status: 400 }
            );
        }

        // Update slug if title changed
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        // Get existing room data to clean up Cloudinary files
        const existingRoom = await prisma.hotelCategory.findUnique({
            where: { id },
            include: {
                images: true
            }
        });

        if (!existingRoom) {
            return NextResponse.json(
                { error: "Room not found" },
                { status: 404 }
            );
        }

        // Collect files to delete from Cloudinary with their resource types
        const filesToDelete: Array<{ publicId: string, resourceType: 'image' | 'video' }> = [];

        // Add image public IDs
        existingRoom.images.forEach(image => {
            if (image.publicId) {
                filesToDelete.push({
                    publicId: image.publicId,
                    resourceType: 'image'
                });
            } else if (image.url) {
                const publicId = extractPublicIdFromUrl(image.url);
                if (publicId) {
                    filesToDelete.push({
                        publicId,
                        resourceType: getResourceTypeFromUrl(image.url)
                    });
                }
            }
        });

        // Add video public ID if it exists
        if (existingRoom.videoUrl) {
            const videoPublicId = extractPublicIdFromUrl(existingRoom.videoUrl);
            if (videoPublicId) {
                filesToDelete.push({
                    publicId: videoPublicId,
                    resourceType: getResourceTypeFromUrl(existingRoom.videoUrl)
                });
            }
        }

        // Delete files from Cloudinary (don't wait for completion to avoid blocking)
        if (filesToDelete.length > 0) {
            // Delete each file with its correct resource type
            Promise.allSettled(
                filesToDelete.map(file =>
                    import('@/lib/cloudinary-delete').then(({ deleteFromCloudinary }) =>
                        deleteFromCloudinary(file.publicId, file.resourceType)
                    )
                )
            ).catch(error => {
                console.error('Failed to delete files from Cloudinary:', error);
            });
        }

        // Delete existing images for this room
        await prisma.galleryImage.deleteMany({
            where: { categoryId: id }
        });

        // Update room with new data
        const room = await prisma.hotelCategory.update({
            where: { id },
            data: {
                slug,
                title,
                description: description || '',
                specs,
                essentialAmenities: essentialAmenities || [],
                roomCount: roomCount || 0,
                videoUrl: videos && videos.length > 0 ? videos[0].url : null,
                images: {
                    create: images?.map((imageData: { url: string, publicId: string }, index: number) => ({
                        category: 'Rooms',
                        url: imageData.url,
                        publicId: imageData.publicId,
                        caption: `${title} - Image ${index + 1}`
                    })) || []
                }
            },
            include: {
                images: true,
                prices: true
            }
        });

        return NextResponse.json(room);
    } catch (error) {
        console.error("Error updating room:", error);
        return NextResponse.json(
            { error: "Failed to update room" },
            { status: 500 }
        );
    }
}

// DELETE - Delete a room
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { error: "Room ID is required" },
                { status: 400 }
            );
        }

        // Get existing room data to clean up Cloudinary files
        const existingRoom = await prisma.hotelCategory.findUnique({
            where: { id: parseInt(id) },
            include: {
                images: true
            }
        });

        if (!existingRoom) {
            return NextResponse.json(
                { error: "Room not found" },
                { status: 404 }
            );
        }

        // Collect files to delete from Cloudinary with their resource types
        const filesToDelete: Array<{ publicId: string, resourceType: 'image' | 'video' }> = [];

        // Add image public IDs
        existingRoom.images.forEach(image => {
            if (image.publicId) {
                filesToDelete.push({
                    publicId: image.publicId,
                    resourceType: 'image'
                });
            } else if (image.url) {
                const publicId = extractPublicIdFromUrl(image.url);
                if (publicId) {
                    filesToDelete.push({
                        publicId,
                        resourceType: getResourceTypeFromUrl(image.url)
                    });
                }
            }
        });

        // Add video public ID if it exists
        if (existingRoom.videoUrl) {
            const videoPublicId = extractPublicIdFromUrl(existingRoom.videoUrl);
            if (videoPublicId) {
                filesToDelete.push({
                    publicId: videoPublicId,
                    resourceType: getResourceTypeFromUrl(existingRoom.videoUrl)
                });
            }
        }

        // Delete room and related data (cascade will handle images and prices)
        await prisma.hotelCategory.delete({
            where: { id: parseInt(id) }
        });

        // Delete files from Cloudinary (after database deletion to avoid orphaned files)
        if (filesToDelete.length > 0) {
            // Delete each file with its correct resource type
            Promise.allSettled(
                filesToDelete.map(file =>
                    import('@/lib/cloudinary-delete').then(({ deleteFromCloudinary }) =>
                        deleteFromCloudinary(file.publicId, file.resourceType)
                    )
                )
            ).catch(error => {
                console.error('Failed to delete files from Cloudinary:', error);
                // Don't fail the request if Cloudinary deletion fails
            });
        }

        return NextResponse.json({ message: "Room deleted successfully" });
    } catch (error) {
        console.error("Error deleting room:", error);
        return NextResponse.json(
            { error: "Failed to delete room" },
            { status: 500 }
        );
    }
}