import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Bell, CheckCircle, AlertCircle, Heart, Clock, MapPin } from 'lucide-react';
import { notificationService } from '../utils/notificationService';
import { formatDistanceToNow } from 'date-fns';

interface NotificationCenterProps {
  userProfile: any;
}

export function NotificationCenter({ userProfile }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    // Connect to notification service
    notificationService.connect(
      userProfile.id,
      userProfile.role,
      userProfile
    );

    // Subscribe to notification updates
    const unsubscribe = notificationService.subscribe((newNotifications) => {
      setNotifications(newNotifications);
    });

    // Load existing notifications
    setNotifications(notificationService.getNotifications());

    return () => {
      unsubscribe();
    };
  }, [userProfile]);

  const filteredNotifications = notifications.filter(notification => 
    filter === 'all' || !notification.read
  );

  const handleMarkAsRead = (notificationId: string) => {
    notificationService.markAsRead(notificationId);
  };

  const handleAcceptBloodRequest = (requestData: any) => {
    notificationService.respondToBloodRequest(
      requestData.id,
      'accept',
      {
        id: userProfile.id,
        name: userProfile.fullName,
        phone: userProfile.phoneNumber,
        bloodType: userProfile.bloodType
      }
    );
  };

  const handleDeclineBloodRequest = (requestData: any) => {
    notificationService.respondToBloodRequest(
      requestData.id,
      'decline',
      {
        id: userProfile.id,
        name: userProfile.fullName
      }
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Center
              {notificationService.getUnreadCount() > 0 && (
                <Badge variant="destructive">
                  {notificationService.getUnreadCount()}
                </Badge>
              )}
            </CardTitle>
            
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                All Notifications
              </Button>
              <Button
                variant={filter === 'unread' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('unread')}
              >
                Unread ({notificationService.getUnreadCount()})
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No notifications yet</p>
              <p className="text-sm">You'll receive alerts for blood requests and updates here</p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onMarkAsRead={handleMarkAsRead}
                onAcceptRequest={handleAcceptBloodRequest}
                onDeclineRequest={handleDeclineBloodRequest}
                userRole={userProfile.role}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationCard({ 
  notification, 
  onMarkAsRead, 
  onAcceptRequest, 
  onDeclineRequest,
  userRole 
}: any) {
  const getNotificationIcon = () => {
    switch (notification.type) {
      case 'blood_request':
        return <Heart className="h-5 w-5 text-red-500" />;
      case 'donation_accepted':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'request_fulfilled':
        return <CheckCircle className="h-5 w-5 text-blue-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const getUrgencyColor = (urgency?: string) => {
    switch (urgency) {
      case 'critical': return 'bg-red-100 border-red-300';
      case 'high': return 'bg-orange-100 border-orange-300';
      case 'medium': return 'bg-yellow-100 border-yellow-300';
      default: return 'bg-blue-100 border-blue-300';
    }
  };

  return (
    <Card className={`border-l-4 ${
      notification.type === 'blood_request' 
        ? getUrgencyColor(notification.data?.urgency)
        : 'border-l-blue-500'
    } ${!notification.read ? 'bg-blue-50' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            {getNotificationIcon()}
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-sm">{notification.title}</h4>
                {!notification.read && (
                  <Badge variant="secondary" className="h-2 w-2 p-0 rounded-full bg-blue-500" />
                )}
              </div>
              
              <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
              
              {notification.type === 'blood_request' && notification.data && (
                <div className="space-y-2 mt-3">
                  <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {notification.data.distance}km away
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Required by: {notification.data.requiredBy}
                    </span>
                  </div>
                  
                  <div className="text-xs space-y-1">
                    <p><strong>Patient:</strong> {notification.data.patientInfo.gender}, Age {notification.data.patientInfo.age}</p>
                    <p><strong>Condition:</strong> {notification.data.patientInfo.condition}</p>
                    <p><strong>Hospital:</strong> {notification.data.hospitalName}</p>
                  </div>
                  
                  {userRole === 'donor' && (
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        onClick={() => onAcceptRequest(notification.data)}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        Accept Request
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onDeclineRequest(notification.data)}
                      >
                        Not Available
                      </Button>
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-gray-400">
                  {formatDistanceToNow(new Date(notification.timestamp))} ago
                </span>
                
                {!notification.read && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onMarkAsRead(notification.id)}
                    className="text-xs"
                  >
                    Mark as read
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
