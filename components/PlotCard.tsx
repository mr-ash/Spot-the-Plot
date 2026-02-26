import React from 'react';
import { Plot, PlotStatus } from '../types';
import { MapPin, MessageCircle, ArrowRight, CheckCircle2, Users } from 'lucide-react';

interface PlotCardProps {
  plot: Plot;
  onClick: (plot: Plot) => void;
}

export const PlotCard: React.FC<PlotCardProps> = ({ plot, onClick }) => {
  const getStatusColor = (status: PlotStatus) => {
    switch (status) {
      case PlotStatus.IDENTIFIED: return 'bg-red-100 text-red-700 border-red-200';
      case PlotStatus.IDEAS_FORMING: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case PlotStatus.IN_PROGRESS: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case PlotStatus.COMPLETED: return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const getStatusLabel = (status: PlotStatus) => {
    switch (status) {
      case PlotStatus.IDENTIFIED: return 'Identified';
      case PlotStatus.IDEAS_FORMING: return 'Ideas Forming';
      case PlotStatus.IN_PROGRESS: return 'In Progress';
      case PlotStatus.COMPLETED: return 'Completed';
    }
  };

  return (
    <div 
      onClick={() => onClick(plot)}
      className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-4 active:bg-gray-50 transition-colors cursor-pointer ${plot.status === PlotStatus.COMPLETED ? 'opacity-90' : ''}`}
    >
      <div className="relative h-48 bg-gray-200">
        <img 
          src={plot.imageUrl} 
          alt={plot.title} 
          className={`w-full h-full object-cover ${plot.status === PlotStatus.COMPLETED ? 'grayscale-[50%]' : ''}`}
        />
        <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(plot.status)} shadow-sm flex items-center gap-1`}>
          {plot.status === PlotStatus.COMPLETED && <CheckCircle2 size={12} />}
          {getStatusLabel(plot.status)}
        </div>
      </div>
      
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className={`font-bold text-lg text-gray-900 leading-tight ${plot.status === PlotStatus.COMPLETED ? 'line-through text-gray-500' : ''}`}>{plot.title}</h3>
        </div>
        
        <div className="flex items-center text-gray-500 text-sm mb-3">
          <MapPin size={14} className="mr-1" />
          <span className="truncate">{plot.locationName}</span>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {plot.volunteerRequestSent && (
             <span className="text-xs bg-orange-100 text-orange-700 border border-orange-200 px-2 py-1 rounded-md flex items-center gap-1 font-medium">
               <Users size={12} /> Help Requested
             </span>
          )}
          {plot.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md">
              #{tag}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-50">
          <div className="flex items-center text-gray-500 text-sm">
            <MessageCircle size={16} className="mr-1" />
            <span>{plot.comments.length} Discussion</span>
          </div>
          <button className="text-emerald-600 text-sm font-semibold flex items-center hover:text-emerald-700">
            Open Room <ArrowRight size={14} className="ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
};