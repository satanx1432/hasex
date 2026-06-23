# Environment Configuration

Create a `.env.local` file in the root directory with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# NVIDIA NIM Configuration
NVIDIA_NIM_API_KEY=your_nvidia_nim_api_key_here
NVIDIA_NIM_ENDPOINT=your_nvidia_nim_endpoint_here

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Setup Instructions

### Supabase Setup
1. Create a new project at [supabase.com](https://supabase.com)
2. Navigate to Project Settings > API
3. Copy the Project URL and Anon Key
4. Replace the placeholders above
5. Run the database migration in Supabase SQL Editor:
   - Open the SQL Editor in your Supabase dashboard
   - Copy and run the contents of `supabase/migrations/001_create_profiles.sql`
   - This creates the profiles table and sets up automatic profile creation on signup

### NVIDIA NIM Setup
1. Get access to NVIDIA NIM at [build.nvidia.com](https://build.nvidia.com)
2. Create an API key
3. Note the endpoint URL for the models you'll use
4. Replace the placeholders above
