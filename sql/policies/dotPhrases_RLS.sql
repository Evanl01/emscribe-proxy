-- Enable row level security
ALTER TABLE public."dotPhrases" ENABLE ROW LEVEL SECURITY;

-- 1️⃣ Users can view their own dot phrases
CREATE POLICY "Users can view their own dot phrases"
ON public."dotPhrases"
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
);

-- 2️⃣ Users can modify their own dot phrases (except user_id)
CREATE POLICY "Users can modify their own dot phrases"
ON public."dotPhrases"
AS PERMISSIVE
FOR ALL
TO authenticated
USING (
    user_id = auth.uid()
)
WITH CHECK (
    user_id = auth.uid() AND
    user_id IS NOT NULL
);

-- 3️⃣ Users can insert dot phrases
CREATE POLICY "Users can insert their own dot phrases"
ON public."dotPhrases"
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
);

-- 4️⃣ Users can update their own dot phrases
CREATE POLICY "Users can update their own dot phrases"
ON public."dotPhrases"
AS PERMISSIVE
FOR UPDATE
TO authenticated
WITH CHECK (
    user_id = auth.uid()
);
