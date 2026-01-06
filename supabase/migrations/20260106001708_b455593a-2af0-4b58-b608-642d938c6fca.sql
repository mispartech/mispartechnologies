-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone_number TEXT,
  gender TEXT,
  department TEXT,
  role TEXT DEFAULT 'member',
  face_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create face_embeddings table
CREATE TABLE public.face_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  embedding JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create attendance table for recognized users
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time TIME NOT NULL,
  face_detections INTEGER DEFAULT 1,
  confidence_score FLOAT,
  recognized_emotion TEXT,
  face_roi_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Create temp_attendance for unrecognized visitors
CREATE TABLE public.temp_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  temp_face_id TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  face_detections INTEGER DEFAULT 1,
  face_roi_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(temp_face_id, date)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.temp_attendance ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Face embeddings policies (only owner can access)
CREATE POLICY "Users can view their own embedding"
  ON public.face_embeddings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own embedding"
  ON public.face_embeddings FOR ALL
  USING (auth.uid() = user_id);

-- Attendance policies (users see their own, admins see all)
CREATE POLICY "Users can view their own attendance"
  ON public.attendance FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert attendance"
  ON public.attendance FOR INSERT
  WITH CHECK (true);

-- Temp attendance (public insert for visitor tracking)
CREATE POLICY "Anyone can view temp attendance"
  ON public.temp_attendance FOR SELECT
  USING (true);

CREATE POLICY "System can insert temp attendance"
  ON public.temp_attendance FOR INSERT
  WITH CHECK (true);

-- Create trigger for auto-updating updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_face_embeddings_updated_at
  BEFORE UPDATE ON public.face_embeddings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create storage bucket for face images
INSERT INTO storage.buckets (id, name, public) VALUES ('face-images', 'face-images', true);

-- Storage policies
CREATE POLICY "Users can upload their own face image"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'face-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view face images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'face-images');

CREATE POLICY "Users can update their own face image"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'face-images' AND auth.uid()::text = (storage.foldername(name))[1]);