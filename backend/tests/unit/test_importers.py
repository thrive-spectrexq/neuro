import pytest

from app.services.ingestion.pipeline import IngestionPipeline


@pytest.mark.asyncio
async def test_obsidian_import_dispatch(mocker):
    pipeline = IngestionPipeline()
    mock_importer = mocker.patch("app.services.ingestion.obsidian.ObsidianImporter.process")
    mock_importer.return_value = [{"content": "test", "metadata": {}}]

    result = await pipeline.process_vault_import("/fake/path", "obsidian")
    assert len(result) == 1
    mock_importer.assert_called_once_with()


@pytest.mark.asyncio
async def test_notion_import_dispatch(mocker):
    pipeline = IngestionPipeline()
    mock_importer = mocker.patch("app.services.ingestion.notion.NotionImporter.process")
    mock_importer.return_value = [{"content": "notion test", "metadata": {}}]

    result = await pipeline.process_vault_import("/fake/path", "notion")
    assert len(result) == 1
    mock_importer.assert_called_once_with()


@pytest.mark.asyncio
async def test_roam_import_dispatch(mocker):
    pipeline = IngestionPipeline()
    mock_importer = mocker.patch("app.services.ingestion.roam.RoamImporter.process")
    mock_importer.return_value = [{"content": "roam test", "metadata": {}}]

    result = await pipeline.process_vault_import("/fake/path", "roam")
    assert len(result) == 1
    mock_importer.assert_called_once_with()
