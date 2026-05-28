import { useEffect, useState, useRef } from 'react';
import {
  Plus, CreditCard as Edit2, Trash2, X, Save, Loader2, Star, Eye, EyeOff,
  GripVertical, ChevronDown, ChevronRight, Tag, Image, Upload, Camera, AlertCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Product, Category } from '../../types';

interface ProductForm {
  name: string;
  description: string;
  price: string;
  image_url: string;
  category_id: string;
  featured: boolean;
  serves: string;
}

const EMPTY_FORM: ProductForm = {
  name: '', description: '', price: '', image_url: '',
  category_id: '', featured: false, serves: '1',
};

const ACCEPTED = 'image/jpeg,image/jpg,image/png,image/webp';
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

// ── Upload helper ──────────────────────────────────────────────────────────

async function uploadProductImage(file: File): Promise<string> {
  const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const path = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from('product-images')
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from('product-images').getPublicUrl(path);
  return data.publicUrl;
}

// ── Componente ─────────────────────────────────────────────────────────────

export default function AdminProducts() {
  const [products, setProducts]         = useState<Product[]>([]);
  const [categories, setCategories]     = useState<Category[]>([]);
  const [loading, setLoading]           = useState(true);
  const [showModal, setShowModal]       = useState(false);
  const [editing, setEditing]           = useState<Product | null>(null);
  const [form, setForm]                 = useState<ProductForm>(EMPTY_FORM);
  const [saving, setSaving]             = useState(false);
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());
  const [dragOver, setDragOver]         = useState<string | null>(null);
  const [draggingId, setDraggingId]     = useState<string | null>(null);
  const [showCatModal, setShowCatModal] = useState(false);
  const [catForm, setCatForm]           = useState({ name: '', icon: '' });
  const [savingCat, setSavingCat]       = useState(false);
  const [imagePreview, setImagePreview] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError]     = useState('');

  const dragItem  = useRef<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // ── Data ──────────────────────────────────────────────────────────────────

  const fetchAll = async () => {
    const [prodRes, catRes] = await Promise.all([
      supabase.from('products').select('*, categories(*)').order('display_order').order('created_at'),
      supabase.from('categories').select('*').order('display_order'),
    ]);
    setProducts(prodRes.data ?? []);
    setCategories(catRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // ── Modal helpers ─────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setImagePreview('');
    setImageError('');
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description,
      price: p.price.toString(),
      image_url: p.image_url,
      category_id: p.category_id,
      featured: p.featured,
      serves: p.serves.toString(),
    });
    setImagePreview(p.image_url);
    setImageError('');
    setShowModal(true);
  };

  // ── Image upload ──────────────────────────────────────────────────────────

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageError('');

    // Validate type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setImageError('Formato inválido. Use JPG, PNG ou WebP.');
      return;
    }

    // Validate size
    if (file.size > MAX_BYTES) {
      setImageError('Imagem muito grande. Máximo 5 MB.');
      return;
    }

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setImagePreview(localUrl);

    // Upload to Supabase Storage
    setUploadingImage(true);
    try {
      const publicUrl = await uploadProductImage(file);
      setForm(f => ({ ...f, image_url: publicUrl }));
      setImagePreview(publicUrl);
    } catch (err: any) {
      setImageError('Falha no upload. Tente novamente.');
      setImagePreview('');
      setForm(f => ({ ...f, image_url: '' }));
    } finally {
      setUploadingImage(false);
      // Reset so same file can be picked again
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const removeImage = () => {
    setImagePreview('');
    setForm(f => ({ ...f, image_url: '' }));
    setImageError('');
    if (fileInput.current) fileInput.current.value = '';
  };

  // ── Save product ──────────────────────────────────────────────────────────

  const save = async () => {
    if (!form.name || !form.price || !form.category_id) return;
    setSaving(true);
    const data = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: parseFloat(form.price),
      image_url: form.image_url.trim(),
      category_id: form.category_id,
      featured: form.featured,
      serves: parseInt(form.serves) || 1,
    };
    if (editing) {
      await supabase.from('products').update(data).eq('id', editing.id);
    } else {
      await supabase.from('products').insert({ ...data, active: true });
    }
    await fetchAll();
    setSaving(false);
    setShowModal(false);
  };

  // ── Product actions ───────────────────────────────────────────────────────

  const toggleActive = async (p: Product) => {
    await supabase.from('products').update({ active: !p.active }).eq('id', p.id);
    await fetchAll();
  };

  const toggleFeatured = async (p: Product) => {
    await supabase.from('products').update({ featured: !p.featured }).eq('id', p.id);
    await fetchAll();
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Remover este produto permanentemente?')) return;
    await supabase.from('products').delete().eq('id', id);
    await fetchAll();
  };

  const toggleCat = (catId: string) => {
    setCollapsedCats(prev => {
      const next = new Set(prev);
      next.has(catId) ? next.delete(catId) : next.add(catId);
      return next;
    });
  };

  // ── Drag & drop reorder ───────────────────────────────────────────────────

  const handleDragStart = (id: string) => {
    dragItem.current = id;
    setDraggingId(id);
  };

  const handleDrop = async (targetId: string) => {
    if (!dragItem.current || dragItem.current === targetId) {
      setDraggingId(null);
      setDragOver(null);
      return;
    }
    const dragIdx = products.findIndex(p => p.id === dragItem.current);
    const dropIdx = products.findIndex(p => p.id === targetId);
    const reordered = [...products];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(dropIdx, 0, moved);
    setProducts(reordered);
    dragItem.current = null;
    setDraggingId(null);
    setDragOver(null);
    await Promise.all(
      reordered.map((p, i) => supabase.from('products').update({ display_order: i }).eq('id', p.id))
    );
  };

  // ── Category ──────────────────────────────────────────────────────────────

  const saveCategory = async () => {
    if (!catForm.name.trim()) return;
    setSavingCat(true);
    await supabase.from('categories').insert({
      name: catForm.name.trim(),
      icon: catForm.icon.trim() || '🍱',
      slug: catForm.name.trim().toLowerCase().replace(/\s+/g, '-'),
      display_order: categories.length,
    });
    await fetchAll();
    setSavingCat(false);
    setShowCatModal(false);
    setCatForm({ name: '', icon: '' });
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const grouped = categories.reduce((acc, cat) => {
    const items = products.filter(p => p.category_id === cat.id);
    acc[cat.id] = { cat, items };
    return acc;
  }, {} as Record<string, { cat: Category; items: Product[] }>);

  const uncategorized = products.filter(
    p => !p.category_id || !categories.find(c => c.id === p.category_id)
  );

  const totalActive   = products.filter(p => p.active).length;
  const totalFeatured = products.filter(p => p.featured).length;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/40 text-sm">
            {products.length} produtos · {totalActive} ativos · {totalFeatured} destaques
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCatModal(true)}
            className="flex items-center gap-2 bg-white/8 hover:bg-white/15 border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
          >
            <Tag className="w-4 h-4" />
            <span className="hidden sm:inline">Categoria</span>
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-lg shadow-red-900/30"
          >
            <Plus className="w-4 h-4" />
            Novo Produto
          </button>
        </div>
      </div>

      {/* Product grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[0,1,2,3,4,5].map(i => (
            <div key={i} className="bg-[#111] border border-white/5 rounded-xl h-24 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          {Object.values(grouped).map(({ cat, items }) => (
            <div key={cat.id}>
              <button
                onClick={() => toggleCat(cat.id)}
                className="w-full flex items-center gap-2 mb-3 group"
              >
                <span className="text-lg">{cat.icon}</span>
                <span className="text-white/70 text-sm font-semibold group-hover:text-white transition-colors">
                  {cat.name}
                </span>
                <span className="text-white/30 text-xs font-normal">({items.length})</span>
                <div className="flex-1 h-px bg-white/8 ml-2" />
                {collapsedCats.has(cat.id)
                  ? <ChevronRight className="w-4 h-4 text-white/30" />
                  : <ChevronDown  className="w-4 h-4 text-white/30" />
                }
              </button>

              {!collapsedCats.has(cat.id) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map(product => (
                    <div
                      key={product.id}
                      draggable
                      onDragStart={() => handleDragStart(product.id)}
                      onDragOver={e => { e.preventDefault(); setDragOver(product.id); }}
                      onDrop={() => handleDrop(product.id)}
                      onDragEnd={() => { setDraggingId(null); setDragOver(null); }}
                      className={`bg-[#111] border rounded-xl overflow-hidden transition-all ${
                        draggingId === product.id ? 'opacity-40 scale-95' :
                        dragOver  === product.id ? 'border-red-500/50 shadow-lg shadow-red-900/15' :
                        !product.active           ? 'border-white/5 opacity-60' :
                                                    'border-white/5 hover:border-white/12'
                      }`}
                    >
                      <div className="flex gap-0">
                        <div className="flex items-center justify-center px-2 cursor-grab active:cursor-grabbing text-white/15 hover:text-white/40 transition-colors">
                          <GripVertical className="w-4 h-4" />
                        </div>
                        <div className="relative w-16 h-16 flex-shrink-0 my-2">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <div className="w-full h-full bg-white/5 rounded-lg flex items-center justify-center">
                              <Image className="w-5 h-5 text-white/20" />
                            </div>
                          )}
                          {!product.active && (
                            <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                              <EyeOff className="w-4 h-4 text-white/50" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 p-2.5 min-w-0">
                          <p className="text-white text-sm font-medium leading-tight line-clamp-2">
                            {product.name}
                          </p>
                          <p className="text-red-500 font-bold text-sm mt-1">
                            R$ {Number(product.price).toFixed(2).replace('.', ',')}
                          </p>
                          <div className="flex items-center gap-1 mt-2">
                            {product.featured && (
                              <span className="text-xs bg-yellow-500/15 text-yellow-400 border border-yellow-500/20 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                <Star className="w-2.5 h-2.5" /> Destaque
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 p-2 flex-shrink-0">
                          <button
                            onClick={() => openEdit(product)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all"
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => toggleActive(product)}
                            className={`p-1.5 rounded-lg transition-all ${
                              product.active
                                ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                                : 'bg-white/5 text-white/30 hover:bg-white/10 hover:text-white'
                            }`}
                            title={product.active ? 'Desativar' : 'Ativar'}
                          >
                            {product.active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => toggleFeatured(product)}
                            className={`p-1.5 rounded-lg transition-all ${
                              product.featured
                                ? 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20'
                                : 'bg-white/5 text-white/30 hover:bg-white/10 hover:text-yellow-400'
                            }`}
                            title={product.featured ? 'Remover destaque' : 'Destacar'}
                          >
                            <Star className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteProduct(product.id)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-red-900/30 text-white/30 hover:text-red-400 transition-all"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {uncategorized.length > 0 && (
            <div>
              <p className="text-white/40 text-sm font-medium mb-3">
                Sem categoria ({uncategorized.length})
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {uncategorized.map(product => (
                  <div
                    key={product.id}
                    className="bg-[#111] border border-white/5 rounded-xl p-3 flex items-center gap-3"
                  >
                    {product.image_url && (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{product.name}</p>
                      <p className="text-red-500 text-sm font-bold">
                        R$ {Number(product.price).toFixed(2).replace('.', ',')}
                      </p>
                    </div>
                    <button
                      onClick={() => openEdit(product)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Product modal ──────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#161616] rounded-t-3xl sm:rounded-2xl w-full max-w-lg border border-white/10 shadow-2xl max-h-[92vh] flex flex-col">

            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 flex-shrink-0">
              <h3 className="text-white font-bold">
                {editing ? 'Editar Produto' : 'Novo Produto'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-white/40 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">

              {/* ── Image upload section ─────────────────────────────────── */}
              <div>
                <label className="text-white/50 text-xs font-medium mb-2 block">
                  Imagem do Produto
                </label>

                {/* Hidden file input */}
                <input
                  ref={fileInput}
                  type="file"
                  accept={ACCEPTED}
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                  aria-label="Selecionar imagem"
                />

                {imagePreview ? (
                  /* Preview state */
                  <div className="relative rounded-xl overflow-hidden bg-white/5 border border-white/10">
                    <img
                      src={imagePreview}
                      alt="Preview do produto"
                      className="w-full h-48 object-cover"
                      onError={() => setImagePreview('')}
                    />
                    {/* Overlay actions */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => fileInput.current?.click()}
                        disabled={uploadingImage}
                        className="flex-1 flex items-center justify-center gap-2 bg-black/60 hover:bg-black/80 backdrop-blur-sm border border-white/20 text-white text-sm font-medium py-2.5 rounded-xl transition-all active:scale-95"
                      >
                        {uploadingImage ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Enviando imagem...</>
                        ) : (
                          <><Camera className="w-4 h-4" /> Trocar imagem</>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={removeImage}
                        disabled={uploadingImage}
                        className="p-2.5 bg-red-900/60 hover:bg-red-900/80 backdrop-blur-sm border border-red-500/30 text-red-400 rounded-xl transition-all active:scale-95"
                        title="Remover imagem"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {/* Upload overlay */}
                    {uploadingImage && (
                      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3">
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                        <p className="text-white text-sm font-medium">Enviando imagem...</p>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Upload button (empty state) */
                  <button
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    disabled={uploadingImage}
                    className={`w-full border-2 border-dashed rounded-xl py-8 flex flex-col items-center justify-center gap-3 transition-all active:scale-98 ${
                      uploadingImage
                        ? 'border-white/20 cursor-wait'
                        : 'border-white/15 hover:border-red-500/50 hover:bg-red-500/5 cursor-pointer'
                    }`}
                  >
                    {uploadingImage ? (
                      <>
                        <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
                        <p className="text-white/50 text-sm font-medium">Enviando imagem...</p>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-2xl bg-white/8 flex items-center justify-center">
                          <Upload className="w-5 h-5 text-white/40" />
                        </div>
                        <div className="text-center px-4">
                          <p className="text-white/70 text-sm font-medium">
                            Toque para selecionar imagem
                          </p>
                          <p className="text-white/30 text-xs mt-1">
                            JPG, PNG ou WebP · máximo 5 MB
                          </p>
                          <p className="text-white/25 text-xs mt-0.5">
                            Abre galeria ou câmera no celular
                          </p>
                        </div>
                      </>
                    )}
                  </button>
                )}

                {/* Error message */}
                {imageError && (
                  <div className="mt-2 flex items-center gap-2 text-red-400 text-xs bg-red-900/20 border border-red-800/30 rounded-lg px-3 py-2">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    {imageError}
                  </div>
                )}
              </div>

              {/* Name */}
              <div>
                <label className="text-white/50 text-xs font-medium mb-2 block">Nome *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Combo Salmão 10 peças"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500 transition-colors"
                />
              </div>

              {/* Price + Serves */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-white/50 text-xs font-medium mb-2 block">Preço (R$) *</label>
                  <input
                    value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="49.90"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-white/50 text-xs font-medium mb-2 block">Serve (pessoas)</label>
                  <input
                    value={form.serves}
                    onChange={e => setForm(f => ({ ...f, serves: e.target.value }))}
                    type="number"
                    min="1"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500 transition-colors"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="text-white/50 text-xs font-medium mb-2 block">Categoria *</label>
                <select
                  value={form.category_id}
                  onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                  className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500 appearance-none transition-colors"
                >
                  <option value="" className="bg-[#111]">Selecione uma categoria...</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id} className="bg-[#111]">{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="text-white/50 text-xs font-medium mb-2 block">Descrição</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Descreva o produto..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500 resize-none h-20 transition-colors placeholder-white/20"
                />
              </div>

              {/* Toggles */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white/4 rounded-xl">
                  <div>
                    <p className="text-white text-sm font-medium">Produto Ativo</p>
                    <p className="text-white/40 text-xs">Visível no cardápio para clientes</p>
                  </div>
                  <button
                    type="button"
                    className="bg-green-600 w-11 h-6 rounded-full relative flex-shrink-0"
                  >
                    <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-white" />
                  </button>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/4 rounded-xl">
                  <div>
                    <p className="text-white text-sm font-medium flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-yellow-400" /> Destaque
                    </p>
                    <p className="text-white/40 text-xs">Aparece em destaque na página inicial</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, featured: !f.featured }))}
                    className={`w-11 h-6 rounded-full relative flex-shrink-0 transition-all ${
                      form.featured ? 'bg-yellow-500' : 'bg-white/15'
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                      form.featured ? 'right-1' : 'left-1'
                    }`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="px-5 py-4 border-t border-white/8 flex-shrink-0">
              <button
                onClick={save}
                disabled={saving || uploadingImage || !form.name || !form.price || !form.category_id}
                className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
                ) : (
                  <><Save className="w-4 h-4" /> {editing ? 'Salvar Alterações' : 'Criar Produto'}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Category modal ─────────────────────────────────────────────────── */}
      {showCatModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#161616] rounded-t-3xl sm:rounded-2xl w-full max-w-sm border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
              <h3 className="text-white font-bold">Nova Categoria</h3>
              <button
                onClick={() => setShowCatModal(false)}
                className="text-white/40 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-white/50 text-xs font-medium mb-2 block">Nome *</label>
                <input
                  value={catForm.name}
                  onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Combos Especiais"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-white/50 text-xs font-medium mb-2 block">Emoji / Ícone</label>
                <input
                  value={catForm.icon}
                  onChange={e => setCatForm(f => ({ ...f, icon: e.target.value }))}
                  placeholder="🍱"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500 transition-colors"
                />
              </div>
              <button
                onClick={saveCategory}
                disabled={savingCat || !catForm.name.trim()}
                className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
              >
                {savingCat
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Criando...</>
                  : <><Plus className="w-4 h-4" /> Criar Categoria</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
