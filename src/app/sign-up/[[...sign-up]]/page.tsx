import { SignUp } from '@clerk/nextjs';
import { ClerkProvider } from '@clerk/nextjs';


export default function SignUpPage() {
  return (
    <ClerkProvider>
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 px-4">
        <div className="w-full max-w-md rounded-2xl p-6 bg-white dark:bg-gray-800 shadow-xl">
          <SignUp
            
        
            appearance={{
              variables: {
                colorPrimary: '#2563EB',
                colorText: '#1F2937',
                colorBackground: '#F9FAFB',
                colorTextSecondary: '#6B7280',
                colorInputBackground: 'white',
                // dark mode override via prefers-color-scheme
                // Clerk only supports light/dark toggle via these values
              },
              elements: {
                card: 'shadow-none border border-gray-200 dark:border-gray-700 rounded-2xl p-6',
                headerTitle: 'text-2xl font-semibold text-gray-800 dark:text-gray-100',
                headerSubtitle: 'text-sm text-gray-500 dark:text-gray-400 mb-4',
                formFieldLabel: 'text-sm text-gray-700 dark:text-gray-300 mb-1',
                formFieldInput:
                  'w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100',
                formButtonPrimary:
                  'w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold',
                socialButtonsBlockButton:
                  'w-full mb-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-200',
                footerActionText: 'text-sm text-gray-600 dark:text-gray-300',
                footerActionLink: 'text-blue-600 hover:underline',
              },
            }}
          />
        </div>
      </div>
    </ClerkProvider>
  );
}