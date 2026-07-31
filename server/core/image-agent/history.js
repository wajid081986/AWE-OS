'use strict';

const supabase = require('../../db/supabase');

async function saveGeneration(data) {
  await supabase.from('image_generations').insert({
    prompt:          data.prompt,
    negative_prompt: data.negativePrompt || null,
    style:           data.style,
    size:            data.size,
    image_base64:    data.base64,
    seed:            data.seed,
    generated_at:    data.generatedAt,
  });
}

async function getHistory(limit = 20) {
  const { data, error } = await supabase
    .from('image_generations')
    .select('*')
    .order('generated_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

async function deleteGeneration(id) {
  const { error } = await supabase.from('image_generations').delete().eq('id', id);
  if (error) throw error;
}

module.exports = { saveGeneration, getHistory, deleteGeneration };
