import { useState } from 'react'
import { useProducts } from '../hooks/useProducts'
import { ProductList } from '../components/products/ProductList'
import { ProductForm } from '../components/products/ProductForm'
import { Modal, ConfirmModal } from '../components/ui/Modal'
import type { ProductWithStock, ProductFormData } from '../types/database'

export function ProductsPage() {
    const { products, loading, error, createProduct, updateProduct, deleteProduct } = useProducts()

    const [showCreateModal, setShowCreateModal] = useState(false)
    const [editingProduct, setEditingProduct] = useState<ProductWithStock | null>(null)
    const [deletingProduct, setDeletingProduct] = useState<ProductWithStock | null>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)

    const handleCreate = async (data: ProductFormData) => {
        const result = await createProduct(data)
        if (!result.error) {
            setShowCreateModal(false)
        }
        return result
    }

    const handleUpdate = async (data: ProductFormData) => {
        if (!editingProduct) return { error: 'Produto não selecionado' }

        const result = await updateProduct(editingProduct.id, data)
        if (!result.error) {
            setEditingProduct(null)
        }
        return result
    }

    const handleDelete = async () => {
        if (!deletingProduct) return

        setDeleteLoading(true)
        const result = await deleteProduct(deletingProduct.id)
        setDeleteLoading(false)

        if (!result.error) {
            setDeletingProduct(null)
        }
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Produtos</h1>
                    <p className="page-subtitle">Gerencie seu catálogo de produtos</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowCreateModal(true)}
                >
                    + Novo Produto
                </button>
            </div>

            {error && (
                <div className="alert alert-error">
                    {error}
                </div>
            )}

            <ProductList
                products={products}
                loading={loading}
                onEdit={setEditingProduct}
                onDelete={setDeletingProduct}
            />

            {/* Create Modal */}
            <Modal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                title="Novo Produto"
            >
                <ProductForm
                    onSubmit={handleCreate}
                    onCancel={() => setShowCreateModal(false)}
                    submitLabel="Cadastrar"
                />
            </Modal>

            {/* Edit Modal */}
            <Modal
                isOpen={!!editingProduct}
                onClose={() => setEditingProduct(null)}
                title="Editar Produto"
            >
                {editingProduct && (
                    <ProductForm
                        initialData={{
                            ...editingProduct,
                            notes: editingProduct.notes ?? undefined,
                        }}
                        onSubmit={handleUpdate}
                        onCancel={() => setEditingProduct(null)}
                        submitLabel="Salvar Alterações"
                    />
                )}
            </Modal>

            {/* Delete Confirmation */}
            <ConfirmModal
                isOpen={!!deletingProduct}
                onClose={() => setDeletingProduct(null)}
                onConfirm={handleDelete}
                title="Excluir Produto"
                message={`Tem certeza que deseja excluir "${deletingProduct?.name}"? Esta ação não pode ser desfeita.`}
                confirmLabel="Excluir"
                danger
                loading={deleteLoading}
            />
        </div>
    )
}
