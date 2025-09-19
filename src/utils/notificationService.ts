import { io, Socket } from 'socket.io-client';
import { toast } from 'react-toastify';

interface BloodRequest {
  id: string;
  bloodType: string;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  location: string;
  distance: number;
  requiredBy: string;
  patientInfo: {
    age: number;
    gender: string;
    condition: string;
  };
  hospitalName: string;
  contactInfo: string;
}

interface NotificationData {
  id: string;
  type: 'blood_request' | 'donation_accepted' | 'request_fulfilled';
  title: string;
  message: string;
  data?: any;
  timestamp: Date;
  read: boolean;
}

class NotificationService {
  private socket: Socket | null = null;
  private notifications: NotificationData[] = [];
  private listeners: ((notifications: NotificationData[]) => void)[] = [];

  connect(userId: string, userRole: string, userProfile: any) {
    if (this.socket) return;

    this.socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
      auth: {
        userId,
        userRole,
        bloodType: userProfile.bloodType,
        location: userProfile.location,
      }
    });

    this.socket.on('connect', () => {
      console.log('🔗 Connected to notification service');
    });

    // Listen for blood request notifications
    this.socket.on('blood_request_match', (data: BloodRequest) => {
      const notification: NotificationData = {
        id: `req_${data.id}_${Date.now()}`,
        type: 'blood_request',
        title: `🩸 ${data.urgency.toUpperCase()} Blood Request`,
        message: `${data.bloodType} blood needed at ${data.hospitalName} (${data.distance}km away)`,
        data,
        timestamp: new Date(),
        read: false
      };

      this.addNotification(notification);
      this.showBrowserNotification(notification);
      this.showToastNotification(notification);
    });

    // Listen for donation acceptance confirmations
    this.socket.on('donation_accepted', (data: any) => {
      const notification: NotificationData = {
        id: `acc_${data.requestId}_${Date.now()}`,
        type: 'donation_accepted',
        title: '✅ Donor Found!',
        message: `${data.donor.name} has accepted your blood request`,
        data,
        timestamp: new Date(),
        read: false
      };

      this.addNotification(notification);
      this.showBrowserNotification(notification);
      this.showToastNotification(notification);
    });

    // Listen for request fulfillment
    this.socket.on('request_fulfilled', (data: any) => {
      const notification: NotificationData = {
        id: `ful_${data.requestId}_${Date.now()}`,
        type: 'request_fulfilled',
        title: '🎉 Request Completed',
        message: `Blood request has been successfully fulfilled`,
        data,
        timestamp: new Date(),
        read: false
      };

      this.addNotification(notification);
      this.showBrowserNotification(notification);
      this.showToastNotification(notification);
    });
  }

  private addNotification(notification: NotificationData) {
    this.notifications.unshift(notification);
    this.notifyListeners();
  }

  private showBrowserNotification(notification: NotificationData) {
    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/blood-icon.png',
        tag: notification.id
      });
    }
  }

  private showToastNotification(notification: NotificationData) {
    if (notification.type === 'blood_request') {
      toast.error(notification.message, {
        onClick: () => this.handleNotificationClick(notification),
        autoClose: 8000
      });
    } else {
      toast.success(notification.message, {
        autoClose: 5000
      });
    }
  }

  private handleNotificationClick(notification: NotificationData) {
    if (notification.type === 'blood_request') {
      // Navigate to request details or show action modal
      window.dispatchEvent(new CustomEvent('bloodRequestNotification', {
        detail: notification.data
      }));
    }
  }

  respondToBloodRequest(requestId: string, response: 'accept' | 'decline', userInfo: any) {
    if (this.socket) {
      this.socket.emit('donor_response', {
        requestId,
        response,
        donorInfo: userInfo
      });
    }
  }

  markAsRead(notificationId: string) {
    this.notifications = this.notifications.map(n => 
      n.id === notificationId ? { ...n, read: true } : n
    );
    this.notifyListeners();
  }

  getNotifications(): NotificationData[] {
    return this.notifications;
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  subscribe(callback: (notifications: NotificationData[]) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.notifications));
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const notificationService = new NotificationService();
