output "queue_url" {
  value = aws_sqs_queue.images.id
}

output "queue_arn" {
  value = aws_sqs_queue.images.arn
}

output "dead_letter_queue_url" {
  value = aws_sqs_queue.dead_letter.id
}
