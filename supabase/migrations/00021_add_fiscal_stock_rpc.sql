-- RPC to calculate stock filtered by fiscal status
CREATE OR REPLACE FUNCTION public.get_fiscal_stock(p_depot_id UUID DEFAULT NULL)
RETURNS TABLE (
    id UUID, -- placeholder for stock table compatibility
    article_id UUID,
    depot_id UUID,
    quantite DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gen_random_uuid() as id,
        m.article_id,
        m.depot_id,
        SUM(CASE WHEN m.type = 'entree' THEN m.quantite ELSE -m.quantite END) as quantite
    FROM public.mouvements_stock m
    WHERE m.inclure_tva = true
    AND (p_depot_id IS NULL OR m.depot_id = p_depot_id)
    GROUP BY m.article_id, m.depot_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_fiscal_stock(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_fiscal_stock(UUID) TO service_role;
