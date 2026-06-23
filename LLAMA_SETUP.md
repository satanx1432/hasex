# Llama 3.2 1B Instruct Setup Guide

## 🔧 Installation

### Using NVIDIA NIM Gateway

The goal validation system uses NVIDIA NIM Gateway for goal validation with automatic fallback:
- Primary model: `meta/llama-3.2-1b-instruct`
- Fallback model: `google/gemma-2-2b-it`

### Step 1: Get NVIDIA NIM API Key

1. Go to https://build.nvidia.com/
2. Sign up or log in
3. Navigate to API Keys
4. Generate a new API key
5. Copy the key for configuration

### Step 2: Configure Environment Variables

Create or update `.env.local` in the behavioral-os directory:

```env
# NVIDIA NIM Configuration
NVIDIA_NIM_ENDPOINT=https://integrate.api.nvidia.com/v1
NVIDIA_NIM_API_KEY=your_api_key_here
```

### Step 3: Test the API

```bash
curl https://integrate.api.nvidia.com/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "meta/llama-3.2-1b-instruct",
    "messages": [{"role": "user", "content": "Hello, how are you?"}],
    "max_tokens": 50
  }'
```

## 🎯 Integration

The goal validation system will automatically use NVIDIA NIM Gateway when configured. If NIM is unavailable, it falls back to keyword-based classification.

## 🔧 Troubleshooting

### API Key Not Found

If you get "NVIDIA_NIM_API_KEY not configured" error:
```bash
# Check your .env.local file
# Ensure NVIDIA_NIM_API_KEY is set
# Restart your development server
```

### Rate Limiting

If you hit rate limits:
```bash
# Check your NVIDIA NIM plan limits
# Consider upgrading for higher limits
# Implement caching for common validations
```

### Connection Refused

If connection is refused:
```bash
# Check your NVIDIA_NIM_ENDPOINT
# Verify your API key is valid
# Check internet connection
```

### Slow Response

NVIDIA NIM is typically fast, but if slow:
```bash
# Check network connectivity
# Consider regional endpoints if available
# Monitor response times
```

## 🚀 Production Considerations

### For Development
- NVIDIA NIM is perfect for testing
- Free tier available
- Consistent API response
- No local setup required

### For Production
- NVIDIA NIM offers production-ready hosting
- High availability and scalability
- Monitor usage and costs
- Implement caching for common validations
- Handle rate limits gracefully

### Alternative: Local Ollama
If you prefer local inference, you can switch back to Ollama by modifying the `callLlamaInstruct` method in `src/lib/goal-validation.ts`.

## 📊 Performance

**Llama 3.2 1B Instruct Specs:**
- 1 billion parameters
- Fast inference via NVIDIA NIM
- Good for classification tasks
- Low memory footprint
- Optimized for structured output

**Typical Response Times via NIM:**
- < 500ms on average
- Suitable for real-time validation
- Consistent performance in cloud

## 🎯 Next Steps

1. Get NVIDIA NIM API key from https://build.nvidia.com/
2. Configure environment variables in .env.local
3. Test with a sample API call
4. Test with a sample goal in the app
5. Monitor response times and usage
6. Implement caching for common validations

The system is designed to work seamlessly with or without NVIDIA NIM, so don't worry if you need to skip this step for now. It will fall back to keyword-based classification.
