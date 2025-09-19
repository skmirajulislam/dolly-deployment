"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  Users,
  DollarSign,
  ImageIcon,
  LogOut,
  Edit,
  Plus,
  Trash2,
} from "lucide-react";
import RoomForm from "@/app/admin/_components/RoomForm";
import GalleryForm from "../_components/GalleryForm";
import PriceForm from "../_components/PriceForm";

interface Room {
  id?: number;
  slug?: string;
  title: string;
  name?: string; // For compatibility with dashboard display
  description: string;
  specs?: Record<string, boolean>; // e.g. { ac: true, wifi: true, tv: true, geyser: true, cctv: true, parking: true }
  essentialAmenities?: string[]; // Essential amenities for the room
  bedType?: string;
  maxOccupancy?: number;
  roomSize?: string;
  videoUrl?: string;
  roomCount: number; // Available rooms count
  images: Array<{ url: string, publicId: string }>;
  videos?: Array<{ url: string, publicId: string }>;
  prices?: Array<{
    id: number;
    hourlyHours: number;
    rateCents: number;
  }>; // Pricing information
  specifications?: string[]; // Room specifications
}

interface GalleryItem {
  id: number;
  category: string;
  url: string;
  caption: string;
  publicId?: string; // Cloudinary public ID for deletion
}

interface GalleryApiResponse {
  id: number;
  category: string;
  url: string;
  caption: string | null;
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<string>("rooms");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [showGalleryForm, setShowGalleryForm] = useState(false);
  const [showPriceForm, setShowPriceForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | undefined>(undefined);
  const [editingPriceRoom, setEditingPriceRoom] = useState<Room | null>(null);

  const onLogout = async () => {
    try {
      await fetch('/api/auth', { method: 'DELETE' });
      window.location.href = '/admin/login';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const [editingGalleryItem, setEditingGalleryItem] = useState<
    GalleryItem | undefined
  >(undefined);

  const loadRooms = async () => {
    try {
      const response = await fetch('/api/admin/rooms');
      if (!response.ok) {
        throw new Error('Failed to fetch rooms');
      }
      const categories = await response.json();

      // Ensure categories is an array
      if (!Array.isArray(categories)) {
        console.error('Categories is not an array:', categories);
        setRooms([]);
        return;
      }

      // Convert categories to room format for dashboard
      const roomsData = categories.map((category: {
        id: number;
        slug: string;
        title: string;
        description: string;
        specs: Record<string, boolean>;
        essentialAmenities: string[];
        bedType: string | null;
        maxOccupancy: number | null;
        roomSize: string | null;
        videoUrl: string | null;
        images: Array<{ url: string }>;
        roomCount: number;
        prices: Array<{ id: number; hourlyHours: number; rateCents: number }>;
      }) => ({
        id: category.id,
        slug: category.slug,
        title: category.title,
        name: category.title, // Use title as name for compatibility
        description: category.description || '',
        specs: category.specs || {},
        essentialAmenities: category.essentialAmenities || [],
        bedType: category.bedType || undefined,
        maxOccupancy: category.maxOccupancy || undefined,
        roomSize: category.roomSize || undefined,
        videoUrl: category.videoUrl || undefined,
        roomCount: category.roomCount,
        prices: category.prices || [], // Include prices from the API
        images: category.images?.filter((img: { url: string, publicId?: string }) => img.url && img.url.trim() !== '').map((img: { url: string, publicId?: string }) => ({
          url: img.url,
          publicId: img.publicId || ''
        })) || [],
        videos: category.videoUrl && category.videoUrl.trim() !== '' ? [{
          url: category.videoUrl,
          publicId: '' // Will be extracted from URL if needed
        }] : []
      }));

      // Debug: Log video data for troubleshooting
      roomsData.forEach(room => {
        if (room.videos && room.videos.length > 0) {
          console.log('Room with video:', room.title, 'Video URL:', room.videos[0].url);
        }
      });

      setRooms(roomsData);
    } catch (error) {
      console.error('Error loading rooms:', error);
      setError('Failed to load rooms');
    }
  };

  const loadGallery = async () => {
    try {
      const response = await fetch('/api/admin/gallery');
      if (!response.ok) {
        throw new Error('Failed to fetch gallery images');
      }
      const result = await response.json();

      if (result.success && Array.isArray(result.data)) {
        // Convert the API response to match our GalleryItem interface
        const galleryData = result.data.map((item: GalleryApiResponse) => ({
          id: item.id,
          category: item.category,
          url: item.url,
          caption: item.caption || '',
        }));

        setGallery(galleryData);
      } else {
        console.error('Unexpected gallery API response:', result);
        setGallery([]);
      }
    } catch (error) {
      console.error("Failed to load gallery:", error);
      setError("Failed to load gallery");
      setGallery([]);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");

      try {
        // Load all data in parallel
        await Promise.all([loadRooms(), loadGallery()]);
      } catch (error) {
        console.error("Failed to fetch data:", error);
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  //   const updateGallery = async (newGallery: GalleryItem[]) => {
  //     const fixedGallery = newGallery.map((item) => ({
  //       ...item,
  //       type: item.type as "image" | "video",
  //     }));
  //     // Update local state first for better UX
  //     setGallery(fixedGallery);
  //     console.log("Updating gallery:", fixedGallery);

  //     try {
  //       await api.updateGallery({ gallery: fixedGallery });
  //       console.log("Gallery updated successfully");
  //     } catch (error) {
  //       console.error("Failed to update gallery:", error);
  //     }
  //   };

  //   const updateRoomAvailability = async (
  //     roomId: number,
  //     newAvailable: number
  //   ) => {
  //     console.log("Updating room availability:", roomId, newAvailable);

  //     const updatedRooms = rooms.map((room) =>
  //       room.id === roomId ? { ...room, available: newAvailable } : room
  //     );

  //     // Update local state first for better UX
  //     setRooms(updatedRooms);

  //     try {
  //       await updateRooms({ rooms: updatedRooms });
  //       console.log("Room availability updated successfully");
  //     } catch (error) {
  //       console.error("Failed to update room availability:", error);
  //       // Revert local state if API call fails
  //       setRooms(rooms);
  //       setError("Failed to update room availability");
  //     }
  //   };

  const handleSaveRoom = async (room: Room) => {
    console.log("Room saved:", room);

    try {
      // Room save is now handled by RoomForm component
      // Just refresh the rooms data to show the updated list
      await loadRooms();

      setShowRoomForm(false);
      setEditingRoom(undefined);

      console.log("Room list refreshed successfully");
    } catch (error) {
      console.error("Failed to refresh room list:", error);
      setError("Failed to refresh room list");
    }
  };

  const handleEditRoom = (room: Room) => {
    setEditingRoom(room);
    setShowRoomForm(true);
  };

  const handleSaveGalleryItem = async (item: GalleryItem) => {
    try {
      // Check if we're editing an existing item
      const isEditing = item.id && gallery.some((g) => g.id === item.id);

      let apiResponse;

      if (isEditing) {
        // For editing, we'll use a PUT request
        const formData = new FormData();
        formData.append('category', item.category);
        formData.append('caption', item.caption || '');

        apiResponse = await fetch(`/api/admin/gallery/${item.id}`, {
          method: 'PUT',
          body: formData,
        });
      } else {
        // For new items, the file should already be uploaded by FileUpload component
        if (!item.url || !item.url.startsWith('http') || !item.publicId) {
          throw new Error('Please upload a file first');
        }

        // Send metadata only (file already uploaded to Cloudinary)
        apiResponse = await fetch('/api/admin/gallery', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            category: item.category,
            url: item.url,
            publicId: item.publicId,
            caption: item.caption || '',
          }),
        });
      }

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        throw new Error(errorData.error || 'Failed to save gallery item');
      }

      // Refresh gallery data
      await loadGallery();

      setShowGalleryForm(false);
      setEditingGalleryItem(undefined);

      console.log("Gallery item saved successfully");
    } catch (error) {
      console.error("Failed to save gallery item:", error);
      setError(error instanceof Error ? error.message : "Failed to save gallery item");
    }
  };

  const handleEditGalleryItem = (item: GalleryItem) => {
    setEditingGalleryItem(item);
    setShowGalleryForm(true);
  };

  const handleDeleteGalleryItem = async (itemId: number) => {
    try {
      const response = await fetch(`/api/admin/gallery/${itemId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete gallery item');
      }

      // Refresh gallery data after successful deletion
      await loadGallery();
      console.log("Gallery item deleted successfully");
    } catch (error) {
      console.error("Failed to delete gallery item:", error);
      setError("Failed to delete gallery item");
    }
  };

  const tabs = [
    { id: "rooms", name: "Rooms", icon: Users },
    { id: "prices", name: "Prices", icon: DollarSign },
    { id: "gallery", name: "Gallery", icon: ImageIcon },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Hotel Admin Dashboard
              </h1>
              <p className="text-gray-600 text-sm mt-1">Manage your hotel operations</p>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">{error}</span>
              <button
                onClick={() => setError("")}
                className="text-red-500 hover:text-red-700 font-bold text-lg"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-lg p-2">
            <nav className="flex space-x-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-3 py-3 px-6 rounded-lg font-semibold text-sm transition-all duration-200 ${activeTab === tab.id
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg transform scale-105"
                      : "bg-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                      }`}
                  >
                    <Icon className="h-5 w-5" />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content */}
        {activeTab === "rooms" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-bold text-gray-900">
                Room Management
              </h2>
              <button
                className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                onClick={() => {
                  setEditingRoom(undefined);
                  setShowRoomForm(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Add New Room
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="bg-white rounded-lg shadow-lg p-6"
                >
                  {room.videos && room.videos.length > 0 ? (
                    <video
                      src={room.videos[0].url}
                      className="w-full h-48 object-cover rounded-lg mb-4"
                      controls
                      muted
                    />
                  ) : room.images && room.images.length > 0 && room.images[0] ? (
                    <Image
                      src={room.images[0].url}
                      alt={room.name || 'Room image'}
                      width={400}
                      height={192}
                      className="w-full h-48 object-cover rounded-lg mb-4"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gray-200 rounded-lg mb-4 flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {room.name}
                  </h3>
                  <p className="text-gray-600 mb-4 text-sm">
                    {room.description.substring(0, 100)}...
                  </p>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-900">Available Rooms:</span>
                      <span className="text-gray-900 font-medium">{room.roomCount || 0}</span>
                    </div>
                    <div className="flex justify-between items-center mt-4">
                      <span className="font-semibold text-gray-900">Features:</span>
                      <button
                        className="text-blue-600 hover:text-blue-800"
                        onClick={() => handleEditRoom(room)}
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {room.specs && Object.entries(room.specs)
                        .filter(([, value]) => value)
                        .slice(0, 3)
                        .map(([spec], index) => (
                          <span
                            key={index}
                            className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full font-medium"
                          >
                            {spec === 'ac' ? 'AC' :
                              spec === 'wifi' ? 'WiFi' :
                                spec === 'tv' ? 'TV' :
                                  spec === 'geyser' ? 'Hot Water' :
                                    spec === 'cctv' ? 'CCTV' :
                                      spec === 'parking' ? 'Parking' :
                                        spec.charAt(0).toUpperCase() + spec.slice(1)}
                          </span>
                        ))}
                      {room.specs && Object.entries(room.specs).filter(([, value]) => value).length > 3 && (
                        <span className="text-xs text-gray-700 font-medium">
                          +{Object.entries(room.specs).filter(([, value]) => value).length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {showRoomForm && (
              <RoomForm
                isOpen={showRoomForm}
                onClose={() => {
                  setShowRoomForm(false);
                  setEditingRoom(undefined);
                }}
                onSave={handleSaveRoom}
                room={editingRoom}
                isEditing={!!editingRoom}
              />
            )}
          </div>
        )}

        {activeTab === "prices" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">
                  Price Management
                </h2>
                <p className="text-gray-600 mt-1">
                  Manage pricing tiers for each room category (up to 4 tiers per room)
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200 hover:shadow-xl transition-shadow duration-200"
                >
                  <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-4">
                    <h3 className="text-xl font-bold text-white mb-1">
                      {room.name}
                    </h3>
                    <p className="text-yellow-100 text-sm">
                      {room.prices?.length || 0}/4 pricing tiers configured
                    </p>
                  </div>
                  <div className="p-6">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-700 flex items-center justify-between">
                        Current Prices:
                        <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                          {room.prices?.length || 0} tiers
                        </span>
                      </h4>
                      {room.prices && room.prices.length > 0 ? (
                        <div className="space-y-2">
                          {room.prices
                            .sort((a, b) => a.hourlyHours - b.hourlyHours)
                            .map((price, index) => (
                              <div key={price.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border">
                                <div className="flex items-center">
                                  <span className="w-6 h-6 bg-yellow-500 text-white text-xs font-bold rounded-full flex items-center justify-center mr-3">
                                    {index + 1}
                                  </span>
                                  <span className="text-gray-700 font-medium">
                                    {`${price.hourlyHours} ${price.hourlyHours === 1 ? 'Hour' : 'Hours'}`}
                                  </span>
                                </div>
                                <span className="font-bold text-green-600 text-lg">
                                  ₹{(price.rateCents / 100).toFixed(2)}
                                </span>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <div className="text-gray-400 mb-2">
                            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                            </svg>
                          </div>
                          <p className="text-gray-500 text-sm">No prices configured</p>
                          <p className="text-gray-400 text-xs">Click &quot;Edit Prices&quot; to add pricing tiers</p>
                        </div>
                      )}
                      <button
                        className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white px-4 py-3 rounded-lg transition-all duration-200 font-semibold shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                        onClick={() => {
                          setEditingPriceRoom(room);
                          setShowPriceForm(true);
                        }}
                      >
                        Edit Prices
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "gallery" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-bold text-gray-900">
                Gallery Management
              </h2>
              <button
                className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                onClick={() => {
                  setEditingGalleryItem(undefined);
                  setShowGalleryForm(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Add New Item
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {gallery.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-lg shadow-lg overflow-hidden"
                >
                  {item.url ? (
                    <Image
                      src={item.url}
                      alt={item.caption || 'Gallery image'}
                      width={400}
                      height={192}
                      className="w-full h-48 object-cover"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  <div className="p-4">
                    <h4 className="font-semibold text-gray-900 mb-1">
                      {item.caption}
                    </h4>
                    <p className="text-gray-600 text-sm mb-3 capitalize">
                      {item.category}
                    </p>
                    <div className="flex justify-between">
                      <button
                        className="text-blue-600 hover:bg-blue-50 p-1 rounded"
                        onClick={() => handleEditGalleryItem(item)}
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        className="text-red-600 hover:bg-red-50 p-1 rounded"
                        onClick={() => handleDeleteGalleryItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {showGalleryForm && (
              <GalleryForm
                isOpen={showGalleryForm}
                onClose={() => {
                  setShowGalleryForm(false);
                  setEditingGalleryItem(undefined);
                }}
                onSave={handleSaveGalleryItem}
                item={editingGalleryItem}
                isEditing={!!editingGalleryItem}
              />
            )}
          </div>
        )}

        {/* Price Form Modal */}
        {showPriceForm && (
          <PriceForm
            isOpen={showPriceForm}
            onClose={() => {
              setShowPriceForm(false);
              setEditingPriceRoom(null);
            }}
            onSave={async () => {
              await loadRooms();
              setShowPriceForm(false);
              setEditingPriceRoom(null);
            }}
            room={editingPriceRoom}
          />
        )}
      </div>
    </div>
  );
}
