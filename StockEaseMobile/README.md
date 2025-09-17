# StockEase Mobile

A React Native mobile application for inventory and sales management, converted from the StockEase web application.

## Features

- **Inventory Management**: Add, edit, and track inventory items
- **Sales Processing**: Create sales transactions with payment methods
- **Stock Alerts**: Monitor low stock and out-of-stock items
- **Reports & Analytics**: View sales reports and charts
- **Supplier Management**: Manage supplier information
- **User Authentication**: Secure login with role-based access
- **Real-time Updates**: Live data synchronization with Firebase

## Technology Stack

- **React Native**: Cross-platform mobile development
- **Expo**: Development platform and tools
- **Firebase**: Backend services (Authentication, Firestore, Storage)
- **React Navigation**: Navigation library
- **React Native Paper**: UI components
- **React Native Chart Kit**: Charts and graphs
- **TypeScript**: Type safety

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd StockEaseMobile
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npx expo start
```

4. Run on device/simulator:
- For Android: Press `a` in the terminal or scan QR code with Expo Go app
- For iOS: Press `i` in the terminal or scan QR code with Expo Go app

### Building for Production

1. Build for Android:
```bash
npx expo build:android
```

2. Build for iOS:
```bash
npx expo build:ios
```

## Project Structure

```
src/
├── components/          # Reusable UI components
├── context/            # React Context providers
├── lib/                # Firebase configuration and utilities
├── navigation/         # Navigation configuration
├── screens/            # Screen components
├── services/           # Business logic and API calls
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

## Key Features

### Authentication
- Email/password login and registration
- Role-based access (Admin/Employee)
- Security questions for password recovery
- Firebase Authentication integration

### Inventory Management
- Add/edit inventory items
- Real-time stock tracking
- Low stock alerts
- Category-based organization
- SKU management

### Sales Processing
- Add items to cart
- Customer information capture
- Multiple payment methods (Cash/Online)
- UPI QR code generation
- Invoice generation and sharing

### Reports & Analytics
- Sales performance charts
- Product performance analysis
- Payment method distribution
- PDF report generation
- Data export capabilities

### Mobile-Specific Features
- Touch-optimized interface
- Swipe gestures
- Pull-to-refresh
- Native navigation
- Offline capability (planned)

## Firebase Configuration

The app uses the same Firebase project as the web version:
- Authentication for user management
- Firestore for data storage
- Real-time synchronization
- Security rules for data protection

## Development Notes

### Converting from Web to Mobile

Key changes made during conversion:
1. **UI Framework**: Replaced React DOM components with React Native components
2. **Navigation**: Replaced React Router with React Navigation
3. **Styling**: Converted CSS to React Native StyleSheet
4. **Charts**: Replaced Recharts with React Native Chart Kit
5. **Forms**: Adapted form handling for mobile input
6. **File Operations**: Replaced browser APIs with Expo APIs

### Mobile-Specific Considerations

1. **Performance**: Optimized for mobile performance
2. **Touch Interface**: Designed for touch interactions
3. **Screen Sizes**: Responsive design for various screen sizes
4. **Platform Differences**: Handled iOS/Android differences
5. **Offline Support**: Planned for future implementation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test on both iOS and Android
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions:
- Email: support@stockease.com
- Documentation: [Coming Soon]
- Issues: Use GitHub Issues for bug reports