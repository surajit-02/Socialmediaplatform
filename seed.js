const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Post = require('./models/Post');
const Comment = require('./models/Comment');

async function seedData() {
  console.log('🌱 Seeding sample social media data...');
  try {
    await User.deleteMany({});
    await Post.deleteMany({});
    await Comment.deleteMany({});

    const passwordHash = await bcrypt.hash('password123', 10);

    // Create Sample Users
    const alex = await User.create({
      name: 'Alex Rivera',
      username: 'alex_tech',
      email: 'alex@example.com',
      password: passwordHash,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
      bio: 'Building the future of web apps 🚀 | Open source enthusiast & JavaScript lover'
    });

    const sophia = await User.create({
      name: 'Sophia Lin',
      username: 'sophia_design',
      email: 'sophia@example.com',
      password: passwordHash,
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
      coverImage: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1200&q=80',
      bio: 'UI/UX Designer 🎨 | Crafting delightful glassmorphic experiences & micro-animations'
    });

    const marcus = await User.create({
      name: 'Marcus Vance',
      username: 'marcus_dev',
      email: 'marcus@example.com',
      password: passwordHash,
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
      coverImage: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
      bio: 'Full-stack developer 💻 | Node.js, Express & MongoDB advocate | Coffee powered ☕'
    });

    const elena = await User.create({
      name: 'Elena Rostova',
      username: 'elena_art',
      email: 'elena@example.com',
      password: passwordHash,
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
      coverImage: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=1200&q=80',
      bio: 'Digital artist & landscape photographer 📸 Exploring modern visual aesthetics'
    });

    // Establish follow connections
    alex.following.push(sophia._id, marcus._id);
    alex.followers.push(sophia._id, elena._id);

    sophia.following.push(alex._id, elena._id);
    sophia.followers.push(alex._id, marcus._id);

    marcus.following.push(alex._id, sophia._id);
    marcus.followers.push(alex._id);

    elena.following.push(alex._id, sophia._id);
    elena.followers.push(sophia._id);

    await alex.save();
    await sophia.save();
    await marcus.save();
    await elena.save();

    // Create Sample Posts
    const post1 = await Post.create({
      author: alex._id,
      content: 'Just launched our brand new social platform interface! Clean dark mode, real-time likes, and instant comment threads. What do you think of this layout? 🔥✨',
      image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1000&q=80',
      likes: [sophia._id, marcus._id, elena._id],
      commentsCount: 2
    });

    const post2 = await Post.create({
      author: sophia._id,
      content: 'Designing UI with subtle glassmorphism and glowing gradient borders brings so much life to modern social feeds! 🎨 Glass cards + neon accents = perfection.',
      image: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1000&q=80',
      likes: [alex._id, elena._id],
      commentsCount: 2
    });

    const post3 = await Post.create({
      author: marcus._id,
      content: 'Express.js + MongoDB is such a clean and powerful combo for RESTful microservices. Building real-time follower networks with Mongoose sub-documents is super intuitive! 💻⚡',
      image: null,
      likes: [alex._id, sophia._id],
      commentsCount: 1
    });

    const post4 = await Post.create({
      author: elena._id,
      content: 'Golden hour lights hitting the city skyline this evening. Captured from the observatory deck! 🌆✨',
      image: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1000&q=80',
      likes: [alex._id, sophia._id, marcus._id],
      commentsCount: 1
    });

    // Create Sample Comments
    await Comment.create({
      post: post1._id,
      author: sophia._id,
      content: 'The typography and dark backdrop look insanely sleek Alex! High quality work 👏'
    });

    await Comment.create({
      post: post1._id,
      author: marcus._id,
      content: 'Super responsive performance! Love how snappy the likes feel.'
    });

    await Comment.create({
      post: post2._id,
      author: alex._id,
      content: '100% agreed! Dark glassmorphism is unmatched when paired with smooth transitions.'
    });

    await Comment.create({
      post: post2._id,
      author: elena._id,
      content: 'Can you share the CSS color variables for that cyan/purple accent gradient?'
    });

    await Comment.create({
      post: post3._id,
      author: alex._id,
      content: 'Mongoose virtuals and populate make post feeds so clean to assemble!'
    });

    await Comment.create({
      post: post4._id,
      author: sophia._id,
      content: 'Breathtaking colors! That lighting is surreal 🌆'
    });

    console.log('✅ Seeding completed successfully!');
  } catch (err) {
    console.error('❌ Seeding error:', err);
  }
}

module.exports = seedData;

if (require.main === module) {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/socialmedia_db';
  mongoose
    .connect(MONGODB_URI)
    .then(async () => {
      await seedData();
      mongoose.disconnect();
    })
    .catch(err => {
      console.error('Mongo connection error during seed:', err);
      process.exit(1);
    });
}
