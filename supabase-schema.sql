-- Supabase Schema for EduPlan AI

-- 1. Documents Table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('book', 'curriculum', 'guide', 'grid')),
    file_path TEXT NOT NULL,
    parsed_content JSONB,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error'))
);

-- 2. Content Structure Table (Chapter -> Unit -> Topic)
CREATE TABLE content_structure (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    chapter_name TEXT NOT NULL,
    unit_name TEXT,
    topic_name TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Lesson Plans Table
CREATE TABLE lesson_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    subject TEXT NOT NULL,
    class_level TEXT NOT NULL,
    unit TEXT NOT NULL,
    period TEXT,
    topic TEXT NOT NULL,
    learning_outcomes TEXT[] NOT NULL, -- Array of 4 outcomes
    warmup_review TEXT,
    teaching_activities JSONB NOT NULL, -- {a, b, c, d}
    evaluation JSONB NOT NULL, -- {a, b, c, d}
    assignments TEXT,
    remarks TEXT,
    content_structure_id UUID REFERENCES content_structure(id) ON DELETE SET NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_structure ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_plans ENABLE ROW LEVEL SECURITY;

-- Create policies (Simplified for now, assuming authenticated users can do everything)
CREATE POLICY "Allow all for authenticated users" ON documents FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON content_structure FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON lesson_plans FOR ALL USING (auth.role() = 'authenticated');
