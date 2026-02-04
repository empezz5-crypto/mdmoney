import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

const allowedEmail = process.env.ALLOWED_GOOGLE_EMAIL;

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async signIn({ profile }) {
      if (!allowedEmail) return true;
      if (!profile?.email) return false;
      return profile.email.toLowerCase() === allowedEmail.toLowerCase();
    },
  },
  pages: {
    signIn: '/signin',
  },
});

export { handler as GET, handler as POST };
