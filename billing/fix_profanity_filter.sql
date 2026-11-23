-- Deploy: обновление фильтра ругани (soma_text_blocked).
-- Применяем один раз в Supabase SQL Editor. Переопределяет функцию на
-- production — новая логика: короткие термины (блять, гей, дура)
-- блокируются только как самостоятельные слова, чтобы не лолась
-- подстроки в нейтральных словах («дурачишься», «расслаблять», «геймер»).
-- Жёсткие термины (хуй, сука, ублюдок, дурень, fuck, shit и т.п.)
-- блокируются при любом вхождении, включая обфускацию.
-- Соответствует клиентскому фильтру somaTextBlocked в room.js (PR #143).
-- Повторный запуск безопасен: create or replace.

create or replace function public.soma_text_blocked(p_text text)
returns boolean
language plpgsql
as $$\ndeclare
    v_clean text;
    v_lower text;
    v_term text;
begin
    if p_text is null then
        return false;
    end if;
    v_clean := regexp_replace(lower(p_text), '[^а-яёa-z0-9]', '', 'g');
    v_lower := lower(p_text);
    -- Жёсткие термины: любое вхождение в очищенной строке — блокируем.
    foreach v_term in array array[
        'хуй', 'хуя', 'хуём', 'хуев', 'хуёв', 'пидар', 'пидор', 'пидарас',
        'педераст', 'падла', 'сука', 'блядь', 'урод', 'ублюдок',
        'дурень', 'fuck', 'shit'
    ] loop
        if v_clean like '%' || v_term || '%' then
            return true;
        end if;
    end loop;
    -- Короткие термины: блокируем только как самостоятельное слово.
    -- Если в исходнике его нет в таком виде (обфускация d-ура),
    -- но он есть в очищенной строке — блокируем.
    foreach v_term in array array['блять', 'гей', 'дура'] loop
        if not (v_clean like '%' || v_term || '%') then
            continue;
        end if;
        if not (v_lower like '%' || v_term || '%') then
            -- обфускация (в исходнике термина нет) — блокируем
            return true;
        end if;
        -- ищем термин как самостоятельное слово (разделители -> пробел)
        if position(' ' || v_term || ' ' in ' ' || regexp_replace(v_lower, '[^а-яёa-z0-9]', ' ', 'g') || ' ') > 0 then
            return true;
        end if;
    end loop;
    return false;
end;
$$;
