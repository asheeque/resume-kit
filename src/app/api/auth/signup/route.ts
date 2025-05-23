import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { AuthResponse } from '@/types';
import { DB_TABLES } from '@/config/database';
import { Database } from '@/types/supabase';


export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name }
    });

    if (error) throw error;

    // Create user profile
    const { error: profileError } = await supabase
      .from(DB_TABLES.USERS)
      .insert([
        {
          id: data.user.id,
          email: data.user.email!,
          name,
        },
      ]);

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Don't throw here, as the user is already created in auth
    }

    const response: AuthResponse = {
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email!,
        name,
        created_at: data.user.created_at,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create account' },
      { status: 400 }
    );
  }
} 