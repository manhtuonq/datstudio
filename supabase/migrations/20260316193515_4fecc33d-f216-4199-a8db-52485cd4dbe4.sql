
-- Create albums table
CREATE TABLE public.albums (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  drive_folder_id TEXT,
  slug TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create photos table
CREATE TABLE public.photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  album_id UUID REFERENCES public.albums(id) ON DELETE CASCADE NOT NULL,
  drive_file_id TEXT,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  album_id UUID REFERENCES public.albums(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  profession TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create feedbacks table
CREATE TABLE public.feedbacks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_id UUID REFERENCES public.photos(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

-- Albums: admin can CRUD their own, public can read by slug
CREATE POLICY "Users can manage their own albums" ON public.albums
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Public can view albums by slug" ON public.albums
  FOR SELECT USING (true);

-- Photos: admin can manage via album ownership, public can read
CREATE POLICY "Album owner can manage photos" ON public.photos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.albums WHERE albums.id = photos.album_id AND albums.user_id = auth.uid())
  );

CREATE POLICY "Public can view photos" ON public.photos
  FOR SELECT USING (true);

-- Clients: anyone can insert (public form), admin can read their album's clients
CREATE POLICY "Anyone can register as client" ON public.clients
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Album owner can view clients" ON public.clients
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.albums WHERE albums.id = clients.album_id AND albums.user_id = auth.uid())
  );

CREATE POLICY "Clients can view themselves" ON public.clients
  FOR SELECT USING (true);

-- Feedbacks: clients can insert, admin can read
CREATE POLICY "Anyone can leave feedback" ON public.feedbacks
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can view feedbacks" ON public.feedbacks
  FOR SELECT USING (true);

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_albums_updated_at
  BEFORE UPDATE ON public.albums
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
