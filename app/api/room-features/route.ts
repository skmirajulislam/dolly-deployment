import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
    try {
        const features = await prisma.roomFeature.findMany({
            where: {
                isActive: true,
            },
            orderBy: {
                sortOrder: 'asc',
            },
        })

        return NextResponse.json({
            success: true,
            data: features,
        })
    } catch (error) {
        console.error('Room features fetch error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch room features' },
            { status: 500 }
        )
    }
}