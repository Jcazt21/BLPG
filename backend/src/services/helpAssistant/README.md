# Help Assistant Service - Optimized Configuration

## 🎯 Token Usage Optimization

This Help Assistant has been optimized to minimize API token consumption and costs:

### Configuration Changes

1. **Centralized Config**: All Help Assistant settings moved from `.env` to `helpAssistantConfig.ts`
2. **Reduced Token Limits**: 
   - Max tokens: 150 (down from 300)
   - Temperature: 0.3 (down from 0.7) for more consistent responses
3. **Aggressive Rate Limiting**:
   - Per minute: 3 (down from 5)
   - Per hour: 20 (down from 50)
   - Per day: 100 (down from 200)
4. **Enhanced Caching**:
   - TTL: 2 hours (up from 1 hour)
   - More aggressive caching to reduce API calls

### Testing Strategy

#### Safe Testing (No API Calls)
```bash
npm run test:help:minimal
```
- Runs all tests with mocked API calls
- Zero token consumption
- Zero cost
- Perfect for development and CI/CD

#### Integration Testing (Real API Calls)
```bash
npm run test:help:integration
```
- ⚠️ **WARNING**: Consumes real API tokens!
- Estimated cost: $0.01-0.05 per run
- Only use when necessary
- Requires confirmation prompt

### Configuration Files

#### Main Config: `helpAssistantConfig.ts`
- All Help Assistant settings
- Token limits and rate limiting
- Cost controls
- Testing mode support

#### Environment: `.env`
- Only contains `GEMINI_API_KEY`
- Cleaned up from previous bloated configuration

### Testing Mode

The service supports a special testing mode:

```typescript
import { helpAssistantConfig } from './config/helpAssistantConfig';

// Enable ultra-conservative limits for testing
helpAssistantConfig.setTestingMode(true);

// Reset to normal limits
helpAssistantConfig.setTestingMode(false);
```

### Cost Controls

Built-in cost monitoring and limits:
- Daily limit: $0.50
- Hourly limit: $0.05
- Automatic fallback to cached/mock responses when limits exceeded

### API Provider Support

**Supported**: 
- ✅ Gemini (Google AI)
- ✅ Mock (for testing)

**Removed**:
- ❌ OpenAI (removed to simplify)
- ❌ Anthropic (removed to simplify)

### Best Practices

1. **Development**: Always use `npm run test:help:minimal`
2. **CI/CD**: Use minimal tests only
3. **Integration**: Only run real API tests before releases
4. **Production**: Monitor token usage via Gemini dashboard

### File Structure

```
helpAssistant/
├── README.md                     # This file
├── helpAssistantService.ts       # Main service
├── helpAssistantConfig.ts        # Configuration (NEW)
├── llmProvider.ts               # Only Gemini + Mock
├── *.test.ts                    # Optimized tests
└── integration.test.ts          # Real API tests (use sparingly)
```

### Migration Notes

If upgrading from the previous version:

1. Remove old env vars from `.env`:
   - `HELP_ASSISTANT_*` (all of them)
   - `OPENAI_API_KEY`
   - `ANTHROPIC_API_KEY`
   - `HELP_RATE_LIMIT_*`
   - `HELP_CACHE_*`
   - `HELP_METRICS_*`

2. Keep only:
   - `GEMINI_API_KEY`

3. All other settings are now in `helpAssistantConfig.ts`

### Monitoring

Check token usage:
- Gemini AI Studio: https://aistudio.google.com/
- Built-in usage tracking in the service
- Cost alerts when approaching limits

### Emergency Procedures

If you accidentally run expensive tests:
1. Check Gemini AI Studio for usage
2. Set `helpAssistantConfig.setTestingMode(true)` to limit further usage
3. Review and adjust rate limits in `helpAssistantConfig.ts`