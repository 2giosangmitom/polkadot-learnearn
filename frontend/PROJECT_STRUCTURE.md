# Project Structure

## Overview

Project được tổ chức theo architecture pattern rõ ràng, tách biệt concerns và dễ maintain.

## Folder Structure

```
frontend/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Home page (Learn & Earn)
│   ├── courses/                 # Courses listing & detail
│   │   ├── page.tsx
│   │   └── [id]/
│   ├── learn/                   # Learning interface
│   │   └── [id]/
│   ├── teacher/                 # Teacher dashboard
│   │   └── create/
│   └── api/                     # API Routes
│       ├── ai/grade/
│       ├── payments/verify/
│       └── webhook/smol402/
│
├── components/                   # Reusable components
│   ├── wallet/                  # Wallet connection (LunoKit)
│   │   ├── WalletProvider.tsx
│   │   ├── WalletButton.tsx
│   │   ├── WalletConnect.tsx
│   │   ├── WalletInfo.tsx
│   │   └── README.md
│   ├── learn/                   # Learning UI components
│   │   ├── StatsCards.tsx
│   │   ├── ModuleCard.tsx
│   │   ├── ModulesList.tsx
│   │   ├── LearningPanel.tsx
│   │   ├── WelcomeScreen.tsx
│   │   └── README.md
│   ├── course/                  # Course components
│   │   ├── CourseCard.tsx
│   │   └── CreateCourseForm.tsx
│   ├── lesson/                  # Lesson components
│   │   └── LessonContent.tsx
│   ├── milestone/               # Milestone components
│   │   └── MilestoneCard.tsx
│   ├── ui/                      # Base UI components
│   │   └── button.tsx
│   ├── ChatInterface.tsx        # AI chat for learning
│   └── AppProviders.tsx         # Global providers
│
├── lib/                         # Business logic & utilities
│   ├── ai/                      # AI services
│   │   └── grader.ts
│   ├── auth/                    # Authentication
│   │   └── index.ts
│   ├── courses/                 # Course management
│   │   └── index.ts
│   ├── payments/                # Payment verification
│   │   └── verify.ts
│   ├── supabase/                # Supabase client
│   │   └── client.ts
│   ├── hooks/                   # Custom React hooks
│   │   ├── useWallet.ts
│   │   └── index.ts
│   └── polkadot.ts             # Polkadot utilities
│
├── types/                       # TypeScript types
│   └── index.ts
│
└── constants/                   # App constants & config
    ├── index.ts                # General constants
    └── modules.ts              # Learning modules data
```

## Design Principles

### 1. **Separation of Concerns**
- **app/**: Routing & page composition
- **components/**: Reusable UI components
- **lib/**: Business logic, API calls, utilities
- **types/**: Type definitions
- **constants/**: Static data & configuration

### 2. **Component Organization**
Components được nhóm theo feature:
- `wallet/`: Tất cả về wallet connection
- `learn/`: Tất cả về learning interface
- `course/`: Tất cả về courses
- `ui/`: Base components có thể dùng ở mọi nơi

### 3. **Colocating Related Files**
Mỗi folder có README.md riêng để document:
- `components/wallet/README.md`
- `components/learn/README.md`

### 4. **Clean Imports**
```tsx
// ✅ Good - Import từ barrel file
import { WalletButton } from '@/components/wallet';
import { ModulesList, LearningPanel } from '@/components/learn';

// ❌ Bad - Import trực tiếp
import WalletButton from '@/components/wallet/WalletButton';
```

### 5. **Type Safety**
- Tất cả types được định nghĩa trong `types/`
- Business data types trong `constants/` (e.g., Module interface)
- Component props types inline hoặc export

## Key Files

### Entry Points
- `app/page.tsx` - Home page
- `app/layout.tsx` - Root layout với providers

### Core Components
- `components/wallet/WalletButton.tsx` - Wallet connection
- `components/learn/LearningPanel.tsx` - Main learning interface
- `components/ChatInterface.tsx` - AI chat

### Business Logic
- `lib/polkadot.ts` - Polkadot API interactions
- `lib/ai/grader.ts` - AI grading logic
- `lib/hooks/useWallet.ts` - Wallet state management

### Data
- `constants/modules.ts` - Learning modules
- `constants/index.ts` - App config

## Migration Path

### Old Structure
```
lib/learningModules.ts → constants/modules.ts
components/WalletButton.tsx → components/wallet/
```

### Benefits
- ✅ Dễ tìm file hơn
- ✅ Logic tách biệt rõ ràng
- ✅ Components nhỏ, dễ test
- ✅ Reusability cao
- ✅ Maintainable

## Best Practices

1. **Always use barrel exports** (`index.ts`)
2. **Keep components focused** - một component làm một việc
3. **Document complex components** - thêm README
4. **Type everything** - TypeScript strict mode
5. **Folder per feature** - không trộn lẫn concerns

## Next Steps

- [ ] Add tests cho từng component
- [ ] Document API routes
- [ ] Add Storybook cho UI components
- [ ] Setup ESLint rules cho import order
