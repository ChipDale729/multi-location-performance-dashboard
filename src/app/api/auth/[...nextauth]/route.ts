import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/db';
import bcrypt from 'bcrypt';
export const runtime = 'nodejs';

const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            return null;
          }

          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
            include: { org: true },
          }).catch(err => {
            console.error('Database error during auth:', err);
            return null;
          });

          if (!user) {
            return null;
          }

          const isValid = await bcrypt.compare(credentials.password, user.password).catch(err => {
            console.error('Bcrypt error:', err);
            return false;
          });
          
          if (!isValid) {
            return null;
          }
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            orgId: user.orgId,
          };
        } catch (error) {
          console.error('Auth authorize error:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.orgId = user.orgId;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).orgId = token.orgId;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt' as const,
  },
  debug: process.env.NODE_ENV === 'development',
  secret: process.env.NEXTAUTH_SECRET || 'dev-secret-please-change-in-production',
};

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);
export const { GET, POST } = handlers;
export { authOptions };
