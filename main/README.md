# Academic Syllabus Management System

A web-based platform for managing and accessing academic syllabi, course materials, and announcements for the B.Tech AIML program.

## Features

- Student and faculty authentication
- Course materials and resources
- Announcements and updates
- Responsive design for all devices
- Secure access control

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Setup Instructions

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd syllabus-a
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Update the values in `.env` with your configuration

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:3000`

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
PORT=3000
JWT_SECRET=your_secure_jwt_secret_here
ADMIN_PASSWORD=your_secure_admin_password_here
```

## Security Considerations

- Always use strong, unique passwords
- Never commit sensitive information to version control
- Keep your dependencies up to date
- Use HTTPS in production

## License

This project is licensed under the MIT License.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.
