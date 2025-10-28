/**
 * Notes Application - Seed Data
 * 
 * NOTE: All note titles and content in {@link SEED_DATA} were generated using AI (Claude)
 * for demonstration and showcase purposes.
 * 
 * Generated: October 2025
 */

import { NoteCategory } from '../graphql/domains/types.generated';

export type SeedItem = DemoUser | DemoNote | DemoNoteUser;

export interface DemoUser {
  type: 'user';
  id: string;
  displayName: string;
  avatarColor: string;
}

export interface DemoNote {
  type: 'note';
  id: string;
  title: string;
  content: string;
}

export interface DemoNoteUser {
  type: 'note-user';
  noteId: string;
  userId: string;
  isOwner: boolean;
  category: NoteCategory;
  trash?: {
    expireDays: number;
    originalCategory: NoteCategory;
  };
}

export const SEED_DATA: readonly SeedItem[] = [
  {
    type: 'user',
    id: 'user-alice-01',
    displayName: 'Alice (Demo 1)',
    avatarColor: '#3b82f6',
  },
  {
    type: 'user',
    id: 'user-bob-02',
    displayName: 'Bob (Demo 2)',
    avatarColor: '#10b981',
  },
  {
    type: 'user',
    id: 'user-carol-03',
    displayName: 'Carol (Demo 3)',
    avatarColor: '#f59e0b',
  },
  {
    type: 'note',
    id: 'note-alice-002',
    title: 'Weekly Grocery List',
    content:
      'Milk, eggs, bread, chicken breast, spinach, tomatoes, pasta, olive oil, coffee beans, yogurt',
  },
  {
    type: 'note',
    id: 'note-alice-003',
    title: 'Book Recommendations',
    content:
      '1. The Midnight Library by Matt Haig\n' +
      '2. Project Hail Mary by Andy Weir\n' +
      '3. Atomic Habits by James Clear\n' +
      '4. The Seven Husbands of Evelyn Hugo',
  },
  {
    type: 'note',
    id: 'note-alice-004',
    title: 'Morning Routine Ideas',
    content:
      'Wake up at 6:30 AM, 10 minutes meditation, light stretching, healthy breakfast, review daily goals. No phone for first 30 minutes.',
  },
  {
    type: 'note',
    id: 'note-alice-006',
    title: 'Birthday Gift Ideas for Mom',
    content:
      'Spa day voucher, gardening tools set, cookbook from her favorite chef, personalized photo album, subscription to audiobook service',
  },
  {
    type: 'note',
    id: 'note-alice-007',
    title: 'Vacation Planning - Italy',
    content:
      'Destinations: Rome (3 days), Florence (2 days), Venice (2 days). Book flights by April 1st. Research hotels in Trastevere area. Must see: Colosseum, Uffizi Gallery, Rialto Bridge.',
  },
  {
    type: 'note',
    id: 'note-alice-008',
    title: 'Home Improvement Tasks',
    content:
      'Fix leaky kitchen faucet, repaint bedroom walls (light gray), install new curtain rods, organize garage, replace air filters',
  },
  {
    type: 'note',
    id: 'note-alice-009',
    title: 'Quarterly Goals Q2 2024',
    content:
      'Professional: Complete certification course, mentor 2 junior developers. Personal: Run 5K race, read 10 books, save $3000. Health: Gym 3x per week, cook 5 meals weekly.',
  },
  {
    type: 'note',
    id: 'note-alice-010',
    title: 'Podcast Episode Ideas',
    content:
      'Episode 1: Remote work productivity hacks\n' +
      'Episode 2: Interview with senior engineer about career growth\n' +
      "Episode 3: Developer tools we can't live without\n" +
      'Episode 4: Work-life balance strategies',
  },
  {
    type: 'note',
    id: 'note-alice-012',
    title: 'Recipes to Try',
    content:
      'Thai Green Curry, Homemade Pizza Dough, Chocolate Lava Cake, Shakshuka, Greek Salad with Homemade Dressing, Beef Stroganoff',
  },
  {
    type: 'note',
    id: 'note-alice-014',
    title: 'Side Project: Budget Tracker App',
    content:
      'Features: expense categorization, monthly reports, budget limits with alerts, receipt photo upload, multi-currency support. Tech stack: React Native, Node.js, PostgreSQL.',
  },
  {
    type: 'note',
    id: 'note-alice-015',
    title: 'Workout Plan - March',
    content:
      'Monday: Upper body strength\n' +
      'Wednesday: Cardio + core\n' +
      'Friday: Lower body strength\n' +
      'Saturday: Yoga or active recovery\n' +
      'Goal: Increase weights by 5% each week',
  },
  {
    type: 'note',
    id: 'note-alice-017',
    title: 'Weekend DIY Project',
    content:
      'Build floating shelves for living room. Materials needed: wood boards (4ft x 10in), L-brackets, wood stain, sandpaper, drill, level. Estimated cost: $80.',
  },
  {
    type: 'note',
    id: 'note-alice-018',
    title: 'Learning Path: AWS Certification',
    content:
      'Week 1-2: EC2, S3, IAM basics\n' +
      'Week 3-4: VPC, RDS, CloudFormation\n' +
      'Week 5-6: Lambda, API Gateway, DynamoDB\n' +
      'Week 7-8: Practice exams and review\n' +
      'Schedule exam for end of April',
  },
  {
    type: 'note',
    id: 'note-alice-019',
    title: 'Garden Planning Spring 2024',
    content:
      'Vegetables: tomatoes, peppers, zucchini, herbs (basil, cilantro, parsley). Flowers: sunflowers, marigolds. Start seeds indoors mid-March, transplant after last frost.',
  },
  {
    type: 'note',
    id: 'note-alice-020',
    title: 'Networking Events to Attend',
    content:
      'March 15: Tech Meetup Downtown\n' +
      'March 28: Women in Tech Conference\n' +
      'April 5: Startup Pitch Night\n' +
      'April 12: Developer Workshop on Microservices',
  },
  {
    type: 'note',
    id: 'note-alice-021',
    title: 'Blog Post Ideas',
    content:
      '1. 5 Things I Wish I Knew as a Junior Developer\n' +
      '2. How to Write Better Code Reviews\n' +
      '3. My Favorite VS Code Extensions\n' +
      '4. Debugging Techniques That Save Time',
  },
  {
    type: 'note',
    id: 'note-alice-022',
    title: 'Monthly Budget Review',
    content:
      'Income: $6,500\n' +
      'Rent: $1,800\n' +
      'Utilities: $200\n' +
      'Groceries: $400\n' +
      'Transport: $150\n' +
      'Savings: $1,500\n' +
      'Investments: $500\n' +
      'Discretionary: $1,950\n' +
      'Goal: Increase savings by $200 next month',
  },
  {
    type: 'note',
    id: 'note-alice-023',
    title: 'Christmas 2023 Trip Photos',
    content:
      "Organized photos into folders: Family Dinner, Mountain Hike, New Year's Eve Party. Need to create photo album and share with family. Best shots for printing: IMG_2045, IMG_2103, IMG_2267.",
  },
  {
    type: 'note',
    id: 'note-alice-024',
    title: 'Old Apartment Moving Checklist',
    content:
      "Completed move on January 15. Changed address with post office, updated driver's license, transferred utilities, returned keys to landlord. Deposit refunded.",
  },
  {
    type: 'note',
    id: 'note-alice-025',
    title: '2023 Tax Documents',
    content:
      'W-2 from employer, 1099 forms from freelance work, mortgage interest statement, charitable donation receipts. Filed on April 10, 2024. Refund: $1,200.',
  },
  {
    type: 'note',
    id: 'note-alice-026',
    title: 'Wedding Planning Notes',
    content:
      'Venue: Rosewood Gardens, Date: June 2023, Guest count: 120. Vendors booked: photographer, caterer, DJ, florist. Final cost: $28,000. Event completed successfully!',
  },
  {
    type: 'note',
    id: 'note-alice-027',
    title: 'Old Project Documentation',
    content:
      'Legacy system documentation for CRM migration project completed in 2022. Tech stack: Angular, Java Spring Boot, MySQL. Code archived in company repository.',
  },
  {
    type: 'note',
    id: 'note-alice-028',
    title: 'Random Test Note',
    content: 'Lorem ipsum dolor sit amet test test test 123',
  },
  {
    type: 'note',
    id: 'note-alice-029',
    title: 'Duplicate Shopping List',
    content: 'Old list, no longer needed',
  },
  {
    type: 'note',
    id: 'note-alice-030',
    title: 'Outdated Meeting Agenda',
    content: 'Meeting happened last year, notes no longer relevant',
  },
  {
    type: 'note',
    id: 'note-bob-002',
    title: 'Car Maintenance Schedule',
    content:
      'Oil change due at 45,000 miles (currently at 43,200). Tire rotation needed. Check brake pads. Next service appointment: March 25.',
  },
  {
    type: 'note',
    id: 'note-bob-004',
    title: 'Weekend Plans',
    content:
      'Saturday: Morning bike ride, lunch with friends at new Italian place, evening movie. Sunday: Grocery shopping, meal prep, catch up on reading.',
  },
  {
    type: 'note',
    id: 'note-bob-005',
    title: 'Investment Portfolio Review',
    content:
      'Current allocation: 60% stocks, 30% bonds, 10% cash. YTD return: +8.5%. Consider rebalancing in Q2. Research: add some international exposure, look into REIT funds.',
  },
  {
    type: 'note',
    id: 'note-bob-007',
    title: 'Hiking Trails to Explore',
    content:
      'Eagle Peak Trail (moderate, 6 miles), Sunset Ridge Loop (easy, 3 miles), Waterfall Canyon (challenging, 8 miles), Lake Vista Path (easy, 2 miles).',
  },
  {
    type: 'note',
    id: 'note-bob-009',
    title: 'Language Learning Progress',
    content:
      'Spanish - Duolingo streak: 45 days. Completed Unit 5. Focus areas: past tense conjugations, food vocabulary. Practice: watch Spanish shows with subtitles.',
  },
  {
    type: 'note',
    id: 'note-bob-011',
    title: 'Conference Notes - DevCon 2023',
    content:
      'Best talks: Microservices at Scale, Modern CI/CD Practices, GraphQL Deep Dive. Networking: connected with engineers from TechCorp and StartupXYZ. Got swag: t-shirts, stickers, water bottle.',
  },
  {
    type: 'note',
    id: 'note-bob-012',
    title: 'Old Phone Backup',
    content:
      'Backed up photos and contacts from old iPhone before switching to new device. Backup saved to external drive on January 2024.',
  },
  {
    type: 'note',
    id: 'note-bob-013',
    title: 'Completed Course Notes',
    content:
      'Finished Advanced React Patterns course on Udemy. Certificate earned. Key takeaways: render props, HOCs, compound components, context API best practices.',
  },
  {
    type: 'note',
    id: 'note-bob-014',
    title: 'Old Work Project',
    content:
      'E-commerce platform redesign project from 2022. Successfully launched. Increased conversion rate by 23%. Full case study saved in portfolio.',
  },
  {
    type: 'note',
    id: 'note-bob-015',
    title: 'Draft Email',
    content: 'Never sent this, outdated now',
  },
  {
    type: 'note',
    id: 'note-bob-016',
    title: 'Test Note Delete Me',
    content: 'Testing note creation functionality',
  },
  {
    type: 'note',
    id: 'note-bob-017',
    title: 'Miscellaneous Links',
    content: 'Random links that are no longer relevant or accessible',
  },
  {
    type: 'note',
    id: 'note-carol-002',
    title: 'Meal Prep Schedule',
    content:
      'Sunday prep: overnight oats (3 servings), grilled chicken (4 portions), roasted vegetables, quinoa salad. Monday-Friday lunches sorted. Snacks: almonds, fruit, protein bars.',
  },
  {
    type: 'note',
    id: 'note-carol-005',
    title: 'Photography Project Ideas',
    content:
      'Series 1: Urban architecture at golden hour. Series 2: Street portraits with natural light. Series 3: Abstract macro shots. Exhibit goal: Local gallery by summer.',
  },
  {
    type: 'note',
    id: 'note-carol-007',
    title: 'Monthly Subscription Audit',
    content:
      'Keep: Netflix ($15), Spotify ($10), Cloud storage ($5), Gym ($45). Cancel: Magazine subscription, unused streaming service. Potential savings: $25/month.',
  },
  {
    type: 'note',
    id: 'note-carol-008',
    title: 'Professional Development Goals',
    content:
      'Q2 2024: Complete UX design certification, speak at local meetup, publish 2 blog posts, contribute to open source project, attend design conference.',
  },
  {
    type: 'note',
    id: 'note-carol-009',
    title: 'Apartment Decor Ideas',
    content:
      'Living room: new area rug, throw pillows, wall art above sofa. Bedroom: blackout curtains, bedside lamps, plants. Kitchen: organize pantry, add floating shelves.',
  },
  {
    type: 'note',
    id: 'note-carol-011',
    title: 'Email Marketing Campaign',
    content:
      "Subject line tests: 3 variations. Target audience: users who haven't logged in for 30+ days. Content: highlight new features, special discount code. A/B test send times.",
  },
  {
    type: 'note',
    id: 'note-carol-012',
    title: 'Running Training Schedule',
    content:
      'Goal: Half marathon in September. Week 1-4: Build base (3-4 miles). Week 5-8: Increase mileage (5-7 miles). Week 9-12: Long runs on weekends (8-11 miles). Include rest days.',
  },
  {
    type: 'note',
    id: 'note-carol-013',
    title: 'Summer 2023 Road Trip',
    content:
      'Visited: Portland, Seattle, Vancouver. Highlights: Pike Place Market, Stanley Park, Columbia River Gorge. Great memories! Photos organized in cloud storage.',
  },
  {
    type: 'note',
    id: 'note-carol-014',
    title: 'Old Freelance Project Files',
    content:
      'Website redesign for local business completed December 2023. Client satisfied, payment received, project files archived. Final invoice: $4,500.',
  },
  {
    type: 'note',
    id: 'note-carol-015',
    title: 'Previous Job Interview Prep',
    content:
      'Prepared for interviews in January 2024. Successfully landed current position. Notes no longer needed but keeping for reference on good answers.',
  },
  {
    type: 'note',
    id: 'note-carol-016',
    title: 'Birthday Party 2023 Planning',
    content:
      '30th birthday celebration at restaurant. Guest list, menu, decorations planned. Event completed successfully. Great turnout!',
  },
  {
    type: 'note',
    id: 'note-carol-017',
    title: 'Old Login Credentials',
    content: 'Outdated credentials for services no longer used',
  },
  {
    type: 'note',
    id: 'note-carol-018',
    title: 'Scratch Notes',
    content: 'Random thoughts and calculations, no longer needed',
  },
  {
    type: 'note',
    id: 'note-carol-019',
    title: 'Duplicate Recipe',
    content: 'Already have this saved elsewhere',
  },
  {
    type: 'note-user',
    noteId: 'note-alice-001',
    userId: 'user-alice-01',
    isOwner: true,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-alice-002',
    userId: 'user-alice-01',
    isOwner: true,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-alice-003',
    userId: 'user-alice-01',
    isOwner: true,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-alice-004',
    userId: 'user-alice-01',
    isOwner: true,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-alice-005',
    userId: 'user-alice-01',
    isOwner: true,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-alice-006',
    userId: 'user-alice-01',
    isOwner: true,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-alice-007',
    userId: 'user-alice-01',
    isOwner: true,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-alice-008',
    userId: 'user-alice-01',
    isOwner: true,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-alice-009',
    userId: 'user-alice-01',
    isOwner: true,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-alice-010',
    userId: 'user-alice-01',
    isOwner: true,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-alice-011',
    userId: 'user-alice-01',
    isOwner: true,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-alice-012',
    userId: 'user-alice-01',
    isOwner: true,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-alice-013',
    userId: 'user-alice-01',
    isOwner: true,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-alice-014',
    userId: 'user-alice-01',
    isOwner: true,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-alice-015',
    userId: 'user-alice-01',
    isOwner: true,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-alice-016',
    userId: 'user-alice-01',
    isOwner: true,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-alice-017',
    userId: 'user-alice-01',
    isOwner: true,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-alice-018',
    userId: 'user-alice-01',
    isOwner: true,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-alice-019',
    userId: 'user-alice-01',
    isOwner: true,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-alice-020',
    userId: 'user-alice-01',
    isOwner: true,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-alice-021',
    userId: 'user-alice-01',
    isOwner: true,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-alice-022',
    userId: 'user-alice-01',
    isOwner: true,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-alice-023',
    userId: 'user-alice-01',
    isOwner: true,
    category: NoteCategory.ARCHIVE,
  },
  {
    type: 'note-user',
    noteId: 'note-alice-024',
    userId: 'user-alice-01',
    isOwner: true,
    category: NoteCategory.ARCHIVE,
  },
  {
    type: 'note-user',
    noteId: 'note-alice-025',
    userId: 'user-alice-01',
    isOwner: true,
    category: NoteCategory.ARCHIVE,
  },
  {
    type: 'note-user',
    noteId: 'note-alice-026',
    userId: 'user-alice-01',
    isOwner: true,
    category: NoteCategory.ARCHIVE,
  },
  {
    type: 'note-user',
    noteId: 'note-alice-027',
    userId: 'user-alice-01',
    isOwner: true,
    category: NoteCategory.ARCHIVE,
  },
  {
    type: 'note-user',
    noteId: 'note-alice-028',
    userId: 'user-alice-01',
    isOwner: true,
    category: NoteCategory.TRASH,
    trash: { expireDays: 2, originalCategory: NoteCategory.DEFAULT },
  },
  {
    type: 'note-user',
    noteId: 'note-alice-029',
    userId: 'user-alice-01',
    isOwner: true,
    category: NoteCategory.TRASH,
    trash: { expireDays: 7, originalCategory: NoteCategory.DEFAULT },
  },
  {
    type: 'note-user',
    noteId: 'note-alice-030',
    userId: 'user-alice-01',
    isOwner: true,
    category: NoteCategory.TRASH,
    trash: { expireDays: 24, originalCategory: NoteCategory.DEFAULT },
  },
  {
    type: 'note-user',
    noteId: 'note-bob-001',
    userId: 'user-bob-02',
    isOwner: true,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-bob-002',
    userId: 'user-bob-02',
    isOwner: true,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-bob-003',
    userId: 'user-bob-02',
    isOwner: true,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-bob-004',
    userId: 'user-bob-02',
    isOwner: true,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-bob-005',
    userId: 'user-bob-02',
    isOwner: true,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-bob-006',
    userId: 'user-bob-02',
    isOwner: true,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-bob-007',
    userId: 'user-bob-02',
    isOwner: true,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-bob-008',
    userId: 'user-bob-02',
    isOwner: true,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-bob-009',
    userId: 'user-bob-02',
    isOwner: true,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-bob-010',
    userId: 'user-bob-02',
    isOwner: true,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-bob-011',
    userId: 'user-bob-02',
    isOwner: true,
    category: NoteCategory.ARCHIVE,
  },
  {
    type: 'note-user',
    noteId: 'note-bob-012',
    userId: 'user-bob-02',
    isOwner: true,
    category: NoteCategory.ARCHIVE,
  },
  {
    type: 'note-user',
    noteId: 'note-bob-013',
    userId: 'user-bob-02',
    isOwner: true,
    category: NoteCategory.ARCHIVE,
  },
  {
    type: 'note-user',
    noteId: 'note-bob-014',
    userId: 'user-bob-02',
    isOwner: true,
    category: NoteCategory.ARCHIVE,
  },
  {
    type: 'note-user',
    noteId: 'note-bob-015',
    userId: 'user-bob-02',
    isOwner: true,
    category: NoteCategory.TRASH,
    trash: { expireDays: 3, originalCategory: NoteCategory.DEFAULT },
  },
  {
    type: 'note-user',
    noteId: 'note-bob-016',
    userId: 'user-bob-02',
    isOwner: true,
    category: NoteCategory.TRASH,
    trash: { expireDays: 9, originalCategory: NoteCategory.DEFAULT },
  },
  {
    type: 'note-user',
    noteId: 'note-bob-017',
    userId: 'user-bob-02',
    isOwner: true,
    category: NoteCategory.TRASH,
    trash: { expireDays: 17, originalCategory: NoteCategory.DEFAULT },
  },
  {
    type: 'note-user',
    noteId: 'note-carol-001',
    userId: 'user-carol-03',
    isOwner: true,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-carol-002',
    userId: 'user-carol-03',
    isOwner: true,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-carol-003',
    userId: 'user-carol-03',
    isOwner: true,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-carol-004',
    userId: 'user-carol-03',
    isOwner: true,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-carol-005',
    userId: 'user-carol-03',
    isOwner: true,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-carol-006',
    userId: 'user-carol-03',
    isOwner: true,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-carol-007',
    userId: 'user-carol-03',
    isOwner: true,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-carol-008',
    userId: 'user-carol-03',
    isOwner: true,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-carol-009',
    userId: 'user-carol-03',
    isOwner: true,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-carol-010',
    userId: 'user-carol-03',
    isOwner: true,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-carol-011',
    userId: 'user-carol-03',
    isOwner: true,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-carol-012',
    userId: 'user-carol-03',
    isOwner: true,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-carol-013',
    userId: 'user-carol-03',
    isOwner: true,
    category: NoteCategory.ARCHIVE,
  },
  {
    type: 'note-user',
    noteId: 'note-carol-014',
    userId: 'user-carol-03',
    isOwner: true,
    category: NoteCategory.ARCHIVE,
  },
  {
    type: 'note-user',
    noteId: 'note-carol-015',
    userId: 'user-carol-03',
    isOwner: true,
    category: NoteCategory.ARCHIVE,
  },
  {
    type: 'note-user',
    noteId: 'note-carol-016',
    userId: 'user-carol-03',
    isOwner: true,
    category: NoteCategory.ARCHIVE,
  },
  {
    type: 'note-user',
    noteId: 'note-carol-017',
    userId: 'user-carol-03',
    isOwner: true,
    category: NoteCategory.TRASH,
    trash: { expireDays: 4, originalCategory: NoteCategory.DEFAULT },
  },
  {
    type: 'note-user',
    noteId: 'note-carol-018',
    userId: 'user-carol-03',
    isOwner: true,
    category: NoteCategory.TRASH,
    trash: { expireDays: 14, originalCategory: NoteCategory.DEFAULT },
  },
  {
    type: 'note-user',
    noteId: 'note-carol-019',
    userId: 'user-carol-03',
    isOwner: true,
    category: NoteCategory.TRASH,
    trash: { expireDays: 17, originalCategory: NoteCategory.DEFAULT },
  },
  {
    type: 'note',
    id: 'note-carol-010',
    title: 'Bug Tracking Template',
    content:
      'Issue ID, Title, Description, Steps to Reproduce, Expected vs Actual Behavior, Environment, Priority (High/Medium/Low), Status, Assignee, Screenshots/Logs.',
  },
  {
    type: 'note',
    id: 'note-carol-006',
    title: 'TypeScript Refactoring Plan',
    content:
      'Phase 1: Convert utility functions and constants. Phase 2: Refactor React components with proper typing. Phase 3: Update API layer with typed responses. Phase 4: Strict mode enabled.',
  },
  {
    type: 'note',
    id: 'note-carol-004',
    title: 'Customer Feedback Summary',
    content:
      'Positive: Love the new UI, faster loading times, intuitive navigation. Concerns: Missing bulk export feature, need more filter options, mobile app occasionally crashes. Action items logged.',
  },
  {
    type: 'note',
    id: 'note-carol-003',
    title: 'Design System Components',
    content:
      'Completed: Button, Input, Modal, Dropdown. In progress: DatePicker, Table, Pagination. Next up: Tabs, Accordion, Toast notifications. Using Figma for design specs.',
  },
  {
    type: 'note',
    id: 'note-carol-001',
    title: 'Research Paper Outline',
    content:
      'Title: Machine Learning Applications in Healthcare\n' +
      'Sections: Introduction, Literature Review, Methodology, Results, Discussion, Conclusion. Target journal: Nature Digital Medicine. Deadline: April 30.',
  },
  {
    type: 'note-user',
    noteId: 'note-carol-001',
    userId: 'user-alice-01',
    isOwner: false,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-carol-001',
    userId: 'user-bob-02',
    isOwner: false,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-carol-003',
    userId: 'user-alice-01',
    isOwner: false,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-carol-003',
    userId: 'user-bob-02',
    isOwner: false,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-carol-004',
    userId: 'user-alice-01',
    isOwner: false,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-carol-004',
    userId: 'user-bob-02',
    isOwner: false,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-carol-006',
    userId: 'user-alice-01',
    isOwner: false,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-carol-006',
    userId: 'user-bob-02',
    isOwner: false,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-carol-010',
    userId: 'user-alice-01',
    isOwner: false,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-carol-010',
    userId: 'user-bob-02',
    isOwner: false,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note',
    id: 'note-bob-010',
    title: 'Performance Optimization Notes',
    content:
      'Database: add indexes on frequently queried columns, implement connection pooling. Frontend: lazy load images, code splitting, use CDN for static assets. API: implement caching layer.',
  },
  {
    type: 'note',
    id: 'note-bob-008',
    title: 'Docker Setup Documentation',
    content:
      'Services: frontend (React), backend (Express), database (PostgreSQL), redis cache. Use docker-compose for local development. Nginx for reverse proxy in production.',
  },
  {
    type: 'note',
    id: 'note-bob-006',
    title: 'Mobile App Feature Ideas',
    content:
      'Dark mode support, push notifications for updates, offline mode, biometric authentication, customizable dashboard, export data to CSV/PDF.',
  },
  {
    type: 'note',
    id: 'note-bob-003',
    title: 'Code Review Feedback',
    content:
      'PR #234: Good work on the refactoring. Suggestions: add error handling for edge cases, extract magic numbers into constants, add unit tests for new utility functions.',
  },
  {
    type: 'note',
    id: 'note-bob-001',
    title: 'Team Standup Notes',
    content:
      'Sprint velocity looking good. Sarah completed authentication module. Mike working on payment integration. Blocker: waiting for API keys from third-party service.',
  },
  {
    type: 'note-user',
    noteId: 'note-bob-001',
    userId: 'user-alice-01',
    isOwner: false,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-bob-001',
    userId: 'user-carol-03',
    isOwner: false,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-bob-003',
    userId: 'user-alice-01',
    isOwner: false,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-bob-003',
    userId: 'user-carol-03',
    isOwner: false,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-bob-006',
    userId: 'user-alice-01',
    isOwner: false,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-bob-006',
    userId: 'user-carol-03',
    isOwner: false,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-bob-008',
    userId: 'user-alice-01',
    isOwner: false,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-bob-008',
    userId: 'user-carol-03',
    isOwner: false,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-bob-010',
    userId: 'user-alice-01',
    isOwner: false,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-bob-010',
    userId: 'user-carol-03',
    isOwner: false,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note',
    id: 'note-alice-016',
    title: 'Client Meeting Prep',
    content:
      "Review last quarter's metrics, prepare demo of new features, discuss timeline for Phase 2, address their concerns about mobile responsiveness, bring pricing options for additional services",
  },
  {
    type: 'note',
    id: 'note-alice-013',
    title: 'Questions for 1-on-1 with Manager',
    content:
      'Career development opportunities, feedback on recent presentation, possibility of conference attendance, team structure changes, training budget allocation',
  },
  {
    type: 'note',
    id: 'note-alice-011',
    title: 'Database Migration Checklist',
    content:
      '1. Backup current database\n' +
      '2. Test migration on staging\n' +
      '3. Schedule maintenance window\n' +
      '4. Run migration scripts\n' +
      '5. Verify data integrity\n' +
      '6. Update connection strings\n' +
      '7. Monitor for errors',
  },
  {
    type: 'note',
    id: 'note-alice-005',
    title: 'API Integration Tasks',
    content:
      '- Implement OAuth2 authentication\n' +
      '- Add rate limiting middleware\n' +
      '- Create error handling for 4xx/5xx responses\n' +
      '- Write integration tests\n' +
      '- Update API documentation',
  },
  {
    type: 'note',
    id: 'note-alice-001',
    title: 'Project Kickoff Meeting Notes',
    content:
      'Discussed project timeline and deliverables. Key dates: Design mockups due March 15, Development sprint starts March 20. Team members assigned to frontend, backend, and QA roles.',
  },
  {
    type: 'note-user',
    noteId: 'note-alice-001',
    userId: 'user-bob-02',
    isOwner: false,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-alice-001',
    userId: 'user-carol-03',
    isOwner: false,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-alice-005',
    userId: 'user-bob-02',
    isOwner: false,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-alice-005',
    userId: 'user-carol-03',
    isOwner: false,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-alice-011',
    userId: 'user-bob-02',
    isOwner: false,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-alice-011',
    userId: 'user-carol-03',
    isOwner: false,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-alice-013',
    userId: 'user-bob-02',
    isOwner: false,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-alice-013',
    userId: 'user-carol-03',
    isOwner: false,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-alice-016',
    userId: 'user-bob-02',
    isOwner: false,
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'note-user',
    noteId: 'note-alice-016',
    userId: 'user-carol-03',
    isOwner: false,
    category: NoteCategory.DEFAULT,
  },
];
