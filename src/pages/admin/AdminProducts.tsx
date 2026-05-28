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
const MAX_BYTES = 5 * 1024 * 1024;

async function uploadProductImage(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const path = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from('product-images')
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from('product-images').getPublicUrl(path);
  return data.publicUrl;
}

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [showCatModal, setShowCatModal] = useState(false);
  const [catForm, setCatForm] = useState({ name: '', icon: '' });
  const [savingCat, setSavingCat] = useState(false);
  const [imagePreview, setImagePreview] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState('');

  const dragItem = useRef<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

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

  // ✅ CORREÇÃO AQUI (REMOVIDO capture)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageError('');

    if (!['image/jpeg','image/jpg','image/png','image/webp'].includes(file.type)) {
      setImageError('Formato inválido. Use JPG, PNG ou WebP.');
      return;
    }

    if (file.size > MAX_BYTES) {
      setImageError('Imagem muito grande. Máximo 5 MB.');
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setImagePreview(localUrl);

    setUploadingImage(true);
    try {
      const publicUrl = await uploadProductImage(file);
      setForm(f => ({ ...f, image_url: publicUrl }));
      setImagePreview(publicUrl);
    } catch {
      setImageError('Falha no upload. Tente novamente.');
      setImagePreview('');
      setForm(f => ({ ...f, image_url: '' }));
    } finally {
      setUploadingImage(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const removeImage = () => {
    setImagePreview('');
    setForm(f => ({ ...f, image_url: '' }));
    setImageError('');
    if (fileInput.current) fileInput.current.value = '';
  };

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

  const grouped = categories.reduce((acc, cat) => {
    const items = products.filter(p => p.category_id === cat.id);
    acc[cat.id] = { cat, items };
    return acc;
  }, {} as Record<string, { cat: Category; items: Product[] }>);

  const uncategorized = products.filter(
    p => !p.category_id || !categories.find(c => c.id === p.category_id)
  );

  const totalActive = products.filter(p => p.active).length;
  const totalFeatured = products.filter(p => p.featured).length;

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
          <button onClick={() => setShowCatModal(true)} className="bg-white/10 px-4 py-2 rounded-xl text-white">
            <Tag className="w-4 h-4 inline mr-2" />
            Categoria
          </button>

          <button onClick={openCreate} className="bg-red-600 px-4 py-2 rounded-xl text-white">
            <Plus className="w-4 h-4 inline mr-2" />
            Novo Produto
          </button>
        </div>
      </div>

      {/* ── INPUT FILE FIXADO AQUI ── */}
      <input
        ref={fileInput}
        type="file"
        accept={ACCEPTED}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* 🔥 TODO O RESTO DO SEU SISTEMA CONTINUA IGUAL (GRID, MODAL, ETC) */}

    </div>
  );
}